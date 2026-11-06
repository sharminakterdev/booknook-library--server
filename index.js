import express from"express";
const app =express();
const PORT= 8000

import { MongoClient } from 'mongodb';

const client = new MongoClient("mongodb://booknook-library:7sFB8gjcJbkdeCss@ac-fwcuazp-shard-00-00.spmeznp.mongodb.net:27017,ac-fwcuazp-shard-00-01.spmeznp.mongodb.net:27017,ac-fwcuazp-shard-00-02.spmeznp.mongodb.net:27017/?ssl=true&replicaSet=atlas-jk7dcn-shard-0&authSource=admin");

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
connectToMongoDB()


 app.get("/",(req,res)=>{
    res.send({message:"server is running"})
 })

 
app.listen(PORT,()=>{
    console.log(    `Server is running at ${PORT}`)
})