import fs from "fs";
import admin from "firebase-admin";
import express from "express";
import { db, connectToDb } from "./db.js";

const credentials = JSON.parse(fs.readFileSync("./credentials.json"));

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(credentials),
});

const app = express();
app.use(express.json());

// Middleware to check auth token
app.use(async (req, res, next) => {
  const { authtoken } = req.headers;

  if (authtoken) {
    try {
      const user = await admin.auth().verifyIdToken(authtoken);
      req.user = user;
    } catch (e) {
      res.sendStatus(400).send("You are not authorized to make this request");
      return;
    }
  }
  req.user = req.user || {};
  next();
});

// Get article info
app.get("/api/articles/:name", async (req, res) => {
  const { name } = req.params;
  console.log(`Received request for article: ${name}`);

  const { uid } = req.user || {};
  console.log(`Request made by user: ${uid || "Guest"}`);
  const article = await db.collection("articles").findOne({ name });

  if (article) {
    const upvoteIds = article.upvoteIds || [];
    article.canUpvote = uid && !upvoteIds.includes(uid);
    res.json(article);
  } else {
    res.sendStatus(404).send("Article Not Found!!");
  }
});

// Middleware to require authentication for the routes below
app.use((req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.sendStatus(401).send("You must be logged in to perform this action");
  }
});

// create upVote
app.put("/api/articles/:name/upvote", async (req, res) => {
  const { name } = req.params;
  const { uid } = req.user;
  const article = await db.collection("articles").findOne({ name });

  if (article) {
    const upvoteIds = article.upvoteIds || [];
    const canUpvote = uid && !upvoteIds.includes(uid);

    if (canUpvote) {
      await db.collection("articles").updateOne(
        { name },
        {
          $inc: { upvotes: 1 },
          $push: { upvoteIds: uid },
        }
      );
    }
    const updatedArticle = await db.collection("articles").findOne({ name });
    res.json(updatedArticle);
  } else {
    res.send("That article doesn't exist");
  }
});

// For Comments
app.post("/api/articles/:name/comments", async (req, res) => {
  const { name } = req.params;
  const { text } = req.body;
  const { email } = req.user;

  await db.collection("articles").updateOne(
    { name },
    {
      $push: { comments: { postedBy: email, text } },
    }
  );
  const article = await db.collection("articles").findOne({ name });

  if (article) {
    res.json(article);
  } else {
    res.send("That article's comments doesnt't exist.");
  }
});

// Start the server after connecting to the database
connectToDb(() => {
  console.log("successfully connected to the database:");
  app.listen(8000, () => {
    console.log("Server is listening on port 8000");
  });
});
