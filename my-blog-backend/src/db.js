import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

let db;

async function connectToDb(cb) {
  try {
    const client = new MongoClient(process.env.MONGO_URI);

    await client.connect();

    db = client.db();
    console.log(" Connected to MongoDB");

    cb();
  } catch (err) {
    console.error("MongoDB connection failed:", err);
  }
}

export { db, connectToDb };