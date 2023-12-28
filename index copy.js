const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { ObjectId } = require("mongodb");
//require("dotenv").config();

const io = require("socket.io")(http, {
  cors: {
    origin: [process.env.VUE_APP_ENDPOINT],
  }
});

// MongoDB-Client
const MongoClient = require("mongodb").MongoClient;
const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_ID}.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);
let database;

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
// Verbindung herstellen
connectDB();

io.on("connection", (socket) => {
  socket.emit('connected', true)

  socket.on("connect_error", (e) => {
    socket.emit("connected", false);
  });

  socket.on("pingServer", () => {
    // check if communication still stands
    socket.emit("serverPinged");
  });

  socket.on("disconnect", async () => {
    // also check if user left from a room
    // find the corresponding roomID
    let roomID = "";
    for (let i = 0; i < rooms.length; i++) {
      if (
        rooms[i].users.find((index) => index.session === socket.id) !==
        undefined
      ) {
        roomID = rooms[i].room;
        await leaveRoom(roomID);
        break;
      }
    }

    if (clients.find((index) => index.session === socket.id) !== undefined) {
      users--;
      console.log("player disconnected: " + users + " logged on");

      clients.splice(
        clients.findIndex((user) => user.session === socket.id),
        1
      );
      io.emit("updateUsers", clients);
    }

    console.log("a user disconnected.");
  });
});

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
      const categories = await database.categories
        .find({ area: area._id })
        .toArray();
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
    console.log(req.body.categoryId);
    const skills = await database.library
      .find({ category: new ObjectId(req.body.categoryId) })
      .toArray();
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

app.get("/", (req, res) => {
  res.send("<h1>Hey Socket.io</h1>");
});

http.listen(process.env.PORT || 4000, () => {
  console.log("listening!");
});