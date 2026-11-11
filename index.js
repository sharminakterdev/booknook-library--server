import express from"express";
import { MongoClient, ObjectId } from 'mongodb';

import 'dotenv/config'
import cors from "cors"
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
app.post("/add-books",async(req,res)=>{
    const data=req.body
    const result=await bookCollection.insertOne(data)
  console.log(result)
    res.json(result)
})

app.get("/books",async(req,res)=>{
    const result=await bookCollection.find().toArray()
    res.send(result)
})

app.get('/books/:id',async(req,res)=>{
  const {id}=req.params
const result=await bookCollection.findOne({_id: new ObjectId(id)})
  res.send(result)
  
})
app.get("/my-books/:email",async(req,res)=>{
  const {email}=req.params
  const result=await bookCollection.find({email:email}).toArray()
  res.send(result)
})

app.patch("/books/:id", async (req, res) => {
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

app.delete("/books/:id", async (req, res) => {
  const { id } = req.params;

  const result = await bookCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});

app.post("/borrows", async (req, res) => {
  const result = await borrowCollection.insertOne({
    ...req.body,
    borrowDate: new Date(),
    status: "borrowed",
  });

  res.send(result);
});
 app.get("/",(req,res)=>{
    res.send({message:"server is running"})
 })

 
app.listen(PORT,()=>{
    console.log(    `Server is running at ${PORT}`)
})