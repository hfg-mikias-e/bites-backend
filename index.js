require("dotenv").config();
const express = require("express");
const { ObjectId } = require("mongodb");
const app = express();

app.use(express.json());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// MongoDB-Client
const MongoClient = require("mongodb").MongoClient;
const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_ID}.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);
let database;

// Verbindung herstellen
connectDB();

// Funktion stellt Verbindung zur Datenbank her
async function connectDB() {
  try {
    await client.connect();
    console.log("Erfolgreich mit Datenbank verbunden!");

    database = {
      badges: client.db("achievements").collection("badges"),
      area: client.db("bites").collection("area"),
      categories: client.db("bites").collection("categories"),
      levels: client.db("bites").collection("levels"),
      library: client.db("bites").collection("library"),
      profile: client.db("users").collection("profile"),
    };
  } catch {
    console.error("Konnte keine Verbindung zur Datenbank herstellen.");
    await client.close();
  }
}

/*
    const eintrag = await database.area.findOne({
        _id: new ObjectId('65897af7e3d0861685e3a4da')
    });

    await database.insertOne({
        originalURL: link,
        shortCode: kuerzel,
        clickCounter: 0,
        dateCreated: new Date(),
        adminCode: admin,
        adminIP: ip
    })

    await database.updateOne(
        { shortCode: data.shortCode },
        { $set: { clickCounter: add } }
    );

    await database.deleteOne(
        { adminCode: req.body.short }
    );
*/

app.get("/getCategories", async (req, res) => {
  try {
    const areas = await database.area.find().toArray();

    let data = [];
    for (area of areas) {
        const categories = await database.categories.find({area: area._id,}).toArray();
        data.push({ name: area.name, skills: categories });
    }

    res.status(200).send(data);
  } catch {
    console.error("categories could not be fetched");
    res.status(500).end();
  }
});

app.post("/getSkills", async (req, res) => {
  try {
    console.log(req.body.categoryId)
    const skills = await database.library.find({category: new ObjectId(req.body.categoryId),}).toArray();
    console.log(skills);
    res.status(200).send(skills);
  } catch {
    console.error("categories could not be fetched");
    res.status(500).end();
  }
});

// "check" Endpoint gibt Status zurück, falls Verbindung besteht
app.get("/check", async (req, res) => {
  res.status(200).end();
});

app.listen(4000, () => {
  console.log("Example app listening!");
});
