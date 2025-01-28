const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { token, mongo_connection } = require("./config.json");

// MONGODB
const mongoose = require("mongoose");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ("data" in command && "execute" in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(
                `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
            );
        }
    }
}

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.login(token);

// MONGODB
mongoose.connect(mongo_connection, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// info.participants[i].summonerName/riotIdGameName
// info.participant[i].totalDamageTaken/totalDamageDealtToChampions/totalHeal/deaths/kills

// zmniejszenie uzycia api ritotu:
// tam gdzie jest fetchMatchDetails(matchId, puuid) dodac klauzule
// ktora pobiera i sprawdza czy dla kazdego puuid w grze dla osob w druzynie
// z osoba ktora byla sprawdzana znajduje sie osoba w bazie danych,
// jesli tak to dla tej osoby tez sprawdzane sa statystyki ALE bez callowania API
// mecze sprawdzone dodaje OD RAZU do bazy danych, jeszcze przed pobraniem listy dla
// kolejnego uzytkownika
