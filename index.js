require("dotenv").config();
//const axios = require("axios");
const express = require("express");
const app = express();
const OneSignal = require('onesignal-node');
//const http = require('http').createServer(app);
const { ObjectId } = require("mongodb");

app.use(express.json({ extended: true }));
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

const OneSignalClient = new OneSignal.Client(process.env.ONESIGNAL_APP_ID, process.env.ONESIGNAL_REST_API_KEY);
//const OneSignalUserClient = new OneSignal.UserClient('userAuthKey');

// Verbindung herstellen
connectDB();

/*
async function sendTestNotification(external_id, date) {
  const notification = {
    headings: {
      en: "TEST",
    },
    contents: {
      en: "This is a test messsage.",
    },
    include_aliases: {
      external_id: [external_id]
    },
    send_after: date,
    target_channel: "push"
  };

  try {
    const send = await OneSignalClient.createNotification(notification)
    console.log("Notification created: " + send)
  } catch {
    console.error("Could not send Notification.")
  }
}
*/

async function cancelPushNotification(accountID, contentId) {
  try {
    const user = await database.profile.findOne({ accountID: accountID })
    const notificationID = user.notifs.find(index => index.content.toString() === contentId).id

    await database.profile.updateOne({
      accountID: accountID
    }, {
      $pull: {
        notifs: {
          content: new ObjectId(contentId)
        }
      }
    })

    await OneSignalClient.cancelNotification(notificationID)
  } catch {
    console.error("there is no existing notif scheduled")
  }
}

async function sendPushNotification(external_id, content, date) {
  console.log(external_id, date)

  const notification = {
    headings: {
      en: "It's almost time for your planned sip!"
      //de: "Dein geplanter Sip steht bald an!"
    },
    contents: {
      en: "Check your exercise again: " + content.name
      //de: "Überprüfe nochmal deine Aufgabe: " + content.name
    },
    include_aliases: {
      external_id: [external_id]
    },
    send_after: date, //"2023-12-31 16:05:00 GMT+0100"
    target_channel: "push"
  };

  await cancelPushNotification(external_id, content.id)

  try {
    const send = await OneSignalClient.createNotification(notification)
    console.log("Notification created.")

    await database.profile.updateOne({ accountID: external_id }, {
      $push: {
        notifs: {
          id: send.body.id,
          content: new ObjectId(content.id),
          date: new Date(date)
        }
      }
    })
  } catch {
    console.log("notification could not be saved or sent.")
  }
};

// Funktion stellt Verbindung zur Datenbank her
async function connectDB() {
  try {
    await client.connect();
    console.log("Erfolgreich mit Datenbank verbunden!");

    database = {
      area: client.db("bites").collection("area"),
      categories: client.db("bites").collection("categories"),
      library: client.db("bites").collection("library"),
      profile: client.db("users").collection("profile"),
    };
  } catch {
    console.error("Konnte keine Verbindung zur Datenbank herstellen.");
    await client.close();
  }
}

app.get("/getData", async (req, res) => {
  console.log("/getData")

  try {
    const areas = await database.area.find().toArray();
    const categories = await database.categories.find().toArray();
    const skills = await database.library.find().toArray();
    res.status(200).send({areas: areas, categories: categories, skills: skills});
  } catch {
    console.error("categories could not be fetched");
    res.status(500).end();
  }
});

/*
app.get("/getAreas", async (req, res) => {
  console.log("/getCategories")

  try {
    const areas = await database.area.find().toArray();
    res.status(200).send(areas);
  } catch {
    console.error("categories could not be fetched");
    res.status(500).end();
  }
});

app.get("/getCategories", async (req, res) => {
  console.log("/getCategories")

  try {
    const categories = await database.categories.find().toArray();
    res.status(200).send(categories);
  } catch {
    console.error("categories could not be fetched");
    res.status(500).end();
  }
});

app.get("/getSkills", async (req, res) => {
  console.log("/getSkills")

  try {
    const skills = await database.library.find().toArray();
    res.status(200).send(skills);
  } catch {
    console.error("skills could not be fetched");
    res.status(500).end();
  }
});
*/

/*
app.post("/getSkills", async (req, res) => {
  console.log("/getSkills")

  try {
    const skills = await database.library.find({ category: new ObjectId(req.body.categoryId) }).toArray();
    res.status(200).send(skills);
  } catch {
    console.error("skills could not be fetched");
    res.status(500).end();
  }
});
*/

app.post("/getBite", async (req, res) => {
  console.log("/getBite")
  
  try {
    const bite = await database.library.findOne({ _id: new ObjectId(req.body.biteId) })
    res.status(200).send(bite);
  } catch {
    console.error("bite could not be fetched");
    res.status(500).end();
  }
});

/*
app.post("/getActiveSips", async (req, res) => {
  console.log("/getActiveSips")

  try {
    let activeSips = []

    if (req.body.activeSips !== undefined) {
      let plannedSips = await req.body.activeSips.map(index => new ObjectId(index))

      activeSips = await database.library.find({
        _id: {
          $in: plannedSips
        }
      }).toArray()

      for (const [index, activeSip] of activeSips.entries()) {
        if (req.body.activeSips[index].date !== undefined) {
          activeSips[index] = { date: req.body.activeSips[index].date, ...activeSip }
        }
      }
    }

    res.status(200).send(activeSips);
  } catch {
    console.error("active sips could not be fetched");
    res.status(500).end();
  }
});
*/

// add the ID of a sip or bite to "done", "active", or "fav"
app.post("/changeBiteState", async (req, res) => {
  console.log("/changeBiteState")

  let exists = null
  let newItem = new ObjectId(req.body.biteId)
  if (req.body.state === 'active') {
    newItem = { id: new ObjectId(req.body.biteId) }
  }

  try {
    if (req.body.state === 'active') {
      exists = await database.profile.findOne({
        accountID: req.body.userId,
        [req.body.state]: {
          "$elemMatch": newItem
        }
      });
    } else {
      exists = await database.profile.findOne({
        accountID: req.body.userId,
        [req.body.state]: {
          $in: [newItem]
        }
      })
    }
  } catch {
    console.log("could not look for bite/sip in " + req.body.state)
    res.status(500).end();
  }

  if (exists === null) {
    try {
      console.log("not added yet -> add to " + req.body.state)

      await database.profile.updateOne({ accountID: req.body.userId }, {
        $push: {
          [req.body.state]: newItem
        }
      })
      
      if (req.body.state === 'done') {
        try {
          await database.profile.updateOne({ accountID: req.body.userId }, {
            $pull: {
              active: {
                id: newItem
              }
            }
          });
        } catch {
          console.error("bite/sip could not be pulled from active")
        }
      }
    } catch {
      console.error("bite/sip could not be added to " + req.body.state)
      res.status(500).end();
    }
  } else if(req.body.state === 'fav') {
    try {
      await database.profile.updateOne({ accountID: req.body.userId }, {
        $pull: {
          fav: {
            id: newItem
          }
        }
      });
    } catch {
      console.error("bite/sip could not be pulled from favs")
    }
  }
  
  res.status(200).end();
})

/*
app.post("/setPath", async (req, res) => {
  console.log("/setPath")

  try {
    await database.profile.updateOne({ accountID: req.body.userId }, {
      $set: {
        currentPath: req.body.currentPath
      }
    })

    res.status(200).end();
  } catch {
    console.error("path could not be set");
    res.status(500).end();
  }
})
*/

app.post("/createUser", async (req, res) => {
  console.log("/createUser")

  try {
    const user = await database.profile.findOne({ accountID: req.body.auth })

    if (user === null) {
      await database.profile.insertOne({
        accountID: req.body.auth,
        name: req.body.name
      })
    }

    console.log(user)
    res.status(200).send(user)
  } catch {
    console.error("profile could not be fetched or created");
    res.status(500).end();
  }
})

app.post("/setNotification", async (req, res) => {
  console.log("/setNotification")

  try {
    await sendPushNotification(req.body.external_id, req.body.content, req.body.date/*.notif*/)

    await database.profile.updateOne({
      accountID: req.body.external_id,
      active: {
        "$elemMatch": { 
          id: new ObjectId(req.body.content.id)
        }
      }
    }, { 
      $set: {
        "active.$": { 
          id: new ObjectId(req.body.content.id),
          date: new Date(req.body.date/*.sip*/)
        }
      }
    });

    res.status(200).end();
  } catch {
    console.error("notif could not be set");
    res.status(500).end();
  }
});

/*
app.post("/testNotification", async (req, res) => {
  try {
    await sendTestNotification(req.body.external_id, req.body.date)

    res.status(200).end();
  } catch {
    console.error("notif could not be set");
    res.status(500).end();
  }
});
*/

app.get('/', (req, res) => {
  console.log("responding!")
  res.status(200).send('<h1>Hey!</h1>').end;
});
app.listen(process.env.PORT || 4000, () => {
  console.log('listening!');
});
