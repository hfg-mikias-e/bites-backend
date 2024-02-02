require("dotenv").config();
const express = require("express");
const app = express();
const OneSignal = require("onesignal-node");

app.use(express.json({ extended: true }));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

const OneSignalClient = new OneSignal.Client(
  process.env.ONESIGNAL_APP_ID,
  process.env.ONESIGNAL_REST_API_KEY
);

async function sendPushNotification(external_id, content, date) {
  const contentType = content.practical ? "Sip" : "Bite";

  const notification = {
    headings: {
      en: "It's time!",
    },
    contents: {
      en:
        "Your planned " +
        contentType +
        ' "' +
        content.name +
        '" is waiting for you!',
    },
    include_aliases: {
      external_id: [external_id],
    },
    send_after: date, //"2023-12-31 16:05:00 GMT+0100"
    target_channel: "push",
    ios_interruption_level: 'time_sensitive',
    priority: 10,
    url: process.env.VUE_APP_ENDPOINT + "/reminder/" + content.id,
  };

  const send = await sendMessage(notification);

  return {
    id: send.body.id,
    content: content.id,
    date: new Date(date),
  };
}

async function sendMessage(notification) {
  let notificationID = "";

  try {
    notificationID = await OneSignalClient.createNotification(notification);
    console.log("Message created.");
  } catch {
    console.error("message could not be sent.");
  }

  return notificationID;
}

app.post("/createUser", async (req, res) => {
  console.log("/createUser");
  console.log(req.body.name, req.body.auth);

  try {
    const user = await database.profile.findOne({ accountID: req.body.auth });

    if (user === null && req.body.name && req.body.auth) {
      await database.profile.insertOne({
        accountID: req.body.auth,
        name: req.body.name,
      });
    }

    console.log(user);
    res.status(200).send(user);
  } catch {
    console.error("profile could not be fetched or created");
    res.status(500).end();
  }
});

app.post("/showMessage", async (req, res) => {
  const notification = {
    headings: {
      en: "Reminder saved!",
    },
    contents: {
      en: req.body.message,
    },
    include_aliases: {
      external_id: [req.body.external_id],
    },
    target_channel: "push",
  };

  try {
    await sendMessage(notification);
    res.status(200).end();
  } catch {
    res.status(500).end();
  }
});

app.post("/createNotification", async (req, res) => {
  try {
    const data = await sendPushNotification(
      req.body.external_id,
      req.body.content,
      req.body.date
    );
    res.status(200).send(data);
  } catch {
    console.error("notif could not be set");
    res.status(500).end();
  }
});

app.post("/cancelNotification", async (req, res) => {
  try {
    console.log(req.body.oldNotif)
    await OneSignalClient.cancelNotification(req.body.oldNotif);
    console.log("notif successfully canceled");
  } catch {
    console.error("notif could not be canceled");
  }
  res.status(200).end();
});

app.get("/", (req, res) => {
  res.status(200).send("<h1>Hey!</h1>").end;
});
app.listen(process.env.PORT || 4000, () => {
  console.log("listening!");
});
