require("dotenv").config();
//const axios = require("axios");
const express = require("express");
const app = express();
const OneSignal = require('onesignal-node');
//const http = require('http').createServer(app);
const { ObjectId } = require("mongodb");

app.use(express.json());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

const OneSignalClient = new OneSignal.Client(process.env.ONESIGNAL_APP_ID, process.env.ONESIGNAL_REST_API_KEY);
//const OneSignalUserClient = new OneSignal.UserClient('userAuthKey');

async function sendPushNotification(external_id) {
  console.log(external_id)
  
  const notification = {
    headings: {
      en: "test",
      de: "TEST"
    },
    contents: {
      en: "test",
      de: "TEST"
    },
    include_aliases: {
      external_id: [external_id]
    },
    include_external_user_ids: [external_id],
    //included_segments: ["Test Users"],
    target_channel: "push",
    channel_for_external_user_ids: "push",
    external_id: external_id
    /*
    data: {
      postId: "1",
    }
    */
  };

  try {
    const send = await OneSignalClient.createNotification(notification);
    console.log(send)
  } catch {
    console.log("oops")
  }
};

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
      const categories = await database.categories.find({ area: area._id, }).toArray();
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
    const skills = await database.library.find({ category: new ObjectId(req.body.categoryId) }).toArray();
    res.status(200).send(skills);
  } catch {
    console.error("skills could not be fetched");
    res.status(500).end();
  }
});

app.post("/getBite", async (req, res) => {
  try {
    const bite = await database.library.findOne({ _id: new ObjectId(req.body.biteId) });
    console.log(bite)
    res.status(200).send(bite);
  } catch {
    console.error("bite could not be fetched");
    res.status(500).end();
  }
});

app.post("/setNotification", async (req, res) => {
  try {
    const pushNotification = await sendPushNotification(req.body.external_id)

    res.status(200).end();
  } catch {
    console.error("skills could not be fetched");
    res.status(500).end();
  }
});

app.get('/', (req, res) => {
  res.status(200).send('<h1>Hey!</h1>').end;
});
app.listen(process.env.PORT || 4000, () => {
  console.log('listening!');
});