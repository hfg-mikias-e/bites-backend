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

async function sendPushNotification(external_id, content, date) {
  console.log(external_id)
  console.log(content)
  console.log(date)

  const notification = {
    headings: {
      en: "It's almost time for your planned sip!",
      de: "Dein geplanter Sip steht bald an!"
    },
    contents: {
      en: "Check your exercise again: " + content.name,
      de: "Überprüfe nochmal deine Aufgabe: " + content.name
    },
    include_aliases: {
      external_id: [external_id]
    },
    send_after: date,//`${date.date} ${date.time}, ${date.zone}`, //"2023-12-31 16:05:00 GMT+0100"
    target_channel: "push"
  };

  try {
    const send = await OneSignalClient.createNotification(notification);
    await database.profile.updateOne({ accountID: external_id }, {
      $push: {
        notifs: {
          id: send.body.id,
          content: content.id
        }
      }
    })
  } catch {
    console.log("notification could not be saved or sent.")
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
    const bite = await database.library.findOne({ _id: new ObjectId(req.body.biteId) })
    const category = await database.categories.findOne({ _id: bite.category })
    res.status(200).send({bite: bite, category: category.name});
  } catch {
    console.error("bite could not be fetched");
    res.status(500).end();
  }
});

app.post("/completeBite", async (req, res) => {
  try {
    const completed = await database.profile.countDocuments({
      accountID: req.body.userId,
      "bites.done": {
        $in: [new ObjectId(req.body.biteId)]
      }
    })

    if (completed === 0) {
      console.log("not completed yet -> complete")
      await database.profile.updateOne({ accountID: req.body.userId }, {
        $push: {
          "bites.done": new ObjectId(req.body.biteId)
        }
      })
    }
    res.status(200).end();
  } catch {
    console.error("bite could not be added to done");
    res.status(500).end();
  }
})
app.post("/favoriteBite", async (req, res) => {
  try {
    const saved = await database.profile.countDocuments({
      accountID: req.body.userId,
      "bites.fav": {
        $in: [new ObjectId(req.body.biteId)]
      }
    })

    if(saved === 0) {
      console.log("not saved yet -> save")
      await database.profile.updateOne({ accountID: req.body.userId }, {
        $push: {
          "bites.fav": new ObjectId(req.body.biteId)
        }
      })
    }
    res.status(200).end();
  } catch {
    console.error("bite could not be added to fav");
    res.status(500).end();
  }
})

app.post("/updateUser", async (req, res) => {
  try {
    const user = await database.profile.findOne({ accountID: req.body.user.auth })

    if (user === null) {
      await database.profile.insertOne({
        accountID: req.body.user.auth,
        name: req.body.user.name
      })
    }

    res.status(200).end();
  } catch {
    console.error("profile could not be fetched or created");
    res.status(500).end();
  }
})

app.post("/setNotification", async (req, res) => {
  try {
    await sendPushNotification(req.body.external_id, req.body.content, req.body.date)
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