const express = require('express')
const app = express()
const port = 4000

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
const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_ID}.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

// Funktion stellt Verbindung zur Datenbank her
async function connectDB() {
    try {
        await client.connect();
        console.log("Erfolgreich mit Datenbank verbunden!")

        return collections = {
            achievements: {
                badges: client.db("achievements").collection("badges")
            },
            bites: {
                area: client.db("bites").collection("area"),
                categories: client.db("bites").collection("categories"),
                levels: client.db("bites").collection("levels"),
                library: client.db("bites").collection("library"),
            },
            users: client.db("users").collection("links")
        }

    } catch {
        console.error("Konnte keine Verbindung zur Datenbank herstellen.")
        await client.close();
    }
}

// Verbindung herstellen
const database = connectDB()
let stat = 500

/*
    let eintrag = await database.findOne({
        adminCode: short
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

// "edit" GET-Endpoint ermittelt zugehörigen Datenbank-Eintrag für den Admin-Code
app.get('/edit/:inputcode', async (req, res) => {
    //in req.params.inputcode steckt das was im Browser angehängt wurde!

    // suche und übergebe zugehörigen Eintrag für Admin-Code
    let data = await database.findOne({
        adminCode: req.params.inputcode
    });

    if (data) {
        // übergebe Informationen
        res.status(200).send(data)
    } else {
        // Eintrag / URL existiert nicht
        res.status(stat).end()
    }
})

// "check" POST-Enpoint gibt Status zurück, falls Verbindung mit Backend besteht
app.post('/check', async (req, res) => {
    res.status(200).end()
})

app.listen(port, () => {
    console.log('Example app listening!')
})