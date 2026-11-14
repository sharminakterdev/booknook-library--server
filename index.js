import express from"express";
import { MongoClient, ObjectId } from 'mongodb';

import 'dotenv/config'
import cors from "cors"
import { createRemoteJWKSet, jwtVerify } from "jose";
const app =express();
const PORT= 8000
app.use(cors())
app.use(express.json())



const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
const mongoClient=await connectToMongoDB();
const db=mongoClient.db("booknook-library")
const bookCollection=db.collection("add-book")
const borrowCollection = db.collection("borrows");



const verifyToken= async(req,res,next)=>{
    const authHeader=req.headers.authorization;
 
  if(!authHeader){
    return res.status(401).send({msg:"Unauthorized"});
  }
  const token=authHeader.split(" ")[1]
  if(!token){
    return res.status(401).send({msg:"Unauthorized!"})
  }
const JWKS=createRemoteJWKSet(new URL("http://localhost:3000/api/auth/jwks"),
);
try{
const {payload}=await jwtVerify(token,JWKS);
console.log(payload)
  next();
}catch(error){
  return res.status(500).send({msg:"Server Error!"});
}

};





await bookCollection.updateMany(
  {},
  [
    {
      $set: {
        totalCopies: {
          $toInt: "$totalCopies",
        },
        availableCopies: {
          $toInt: {
            $ifNull: ["$availableCopies", "$totalCopies"],
          },
        },
      },
    },
  ]
);

console.log("Old book copies converted to numbers!");

app.post("/add-books", verifyToken, async (req, res) => {
  try {
    const data = req.body;

    const result = await bookCollection.insertOne({
      ...data,
      totalCopies: Number(data.totalCopies),
      availableCopies: Number(data.availableCopies ?? data.totalCopies),
      createdAt: new Date(),
    });

    res.status(201).send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to add book" });
  }
});

app.get("/books",async(req,res)=>{
    const result=await bookCollection.find().toArray()
    res.send(result)
})
app.get("/books/latest", async (req, res) => {
  const result = await bookCollection
    .find()
    .sort({ createdAt: -1 })
    .limit(6)
    .toArray();

  res.send(result);
});

app.get('/books/:id',verifyToken,
  async(req,res)=>{

  const {id}=req.params
const result=await bookCollection.findOne({_id: new ObjectId(id)})
  res.send(result)
  
})
app.get("/my-books/:email",async(req,res)=>{
  const {email}=req.params
  const result=await bookCollection.find({email:email}).toArray()
  res.send(result)
})

app.patch("/books/:id",verifyToken, async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  const result = await bookCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: updatedData,
    }
  );

  res.send(result);
});

app.delete("/books/:id",verifyToken, async (req, res) => {
  const { id } = req.params;

  const result = await bookCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});

// app.post("/borrows", async (req, res) => {
//   const result = await borrowCollection.insertOne({
//     ...req.body,
//     borrowDate: new Date(),
//     status: "borrowed",
//   });

//   res.send(result);
// });
app.post("/borrows",verifyToken, async (req, res) => {
  try {
    const { bookId, borrowerEmail } = req.body;

    if (!ObjectId.isValid(bookId) || !borrowerEmail) {
      return res.status(400).send({
        message: "Invalid information",
      });
    }

    const email = borrowerEmail.trim().toLowerCase();

    // Check duplicate borrow
    const existing = await borrowCollection.findOne({
      bookId,
      borrowerEmail: email,
    });

    if (existing) {
      return res.status(409).send({
        message: "You have already borrowed this book!",
      });
    }

    // Decrease available copies
    const stock = await bookCollection.updateOne(
      {
        _id: new ObjectId(bookId),
        availableCopies: { $gt: 0 },
      },
      {
        $inc: { availableCopies: -1 },
      }
    );

    if (stock.matchedCount === 0) {
      return res.status(409).send({
        message: "Book is currently unavailable!",
      });
    }

    try {
      const result = await borrowCollection.insertOne({
        ...req.body,
        bookId,
        borrowerEmail: email,
        borrowDate: new Date(),
        status: "borrowed",
      });

      return res.status(201).send(result);
    } catch (error) {
      // Restore stock if insert fails
      await bookCollection.updateOne(
        { _id: new ObjectId(bookId) },
        { $inc: { availableCopies: 1 } }
      );

      throw error;
    }
  } catch (error) {
    console.error("Borrow API Error:", error);

    res.status(500).send({
      message: "Failed to borrow book",
    });
  }
});

app.get("/borrows",verifyToken, async (req, res) => {
  const { email } = req.query;

  const result = await borrowCollection
    .find({ borrowerEmail: email })
    .toArray();

  res.send(result);
});
app.delete("/borrows/:id",verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid borrow ID",
      });
    }

    // Find borrow record
    const borrow = await borrowCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!borrow) {
      return res.status(404).send({
        message: "Borrow record not found",
      });
    }

    // Delete borrow record
    const result = await borrowCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "Borrow record not found",
      });
    }

    // Increase available copies
    await bookCollection.updateOne(
      { _id: new ObjectId(borrow.bookId) },
      { $inc: { availableCopies: 1 } }
    );

    res.send({
      success: true,
      message: "Book returned successfully",
    });

  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: "Failed to return book",
    });
  }
});
 app.get("/",(req,res)=>{
    res.send({message:"server is running"})
 })

 
app.listen(PORT,()=>{
    console.log(    `Server is running at ${PORT}`)
})