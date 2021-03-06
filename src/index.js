/**
 * @file main(): basically where everything is initialized
 */

// Imports
const Ascii = require("ascii-table");
const { Client, Collection } = require("discord.js");
const { config } = require("dotenv");
const { readdirSync } = require("fs");
const { COVID19API } = require("@evrimfeyyaz/covid-19-api");
const nodeFetch = require("node-fetch");
const DBUtils = require("./utils/DBUtils");
global.ms = require("ms");
global.colors = require("./utils/colors.json");

// Setup bot
const bot = new Client({
    disableEveryone: true,
    partials: ["MESSAGE", "CHANNEL", "REACTION"],
});

bot.aliases = new Collection();
bot.categories = readdirSync(`${__dirname}/commands/`);
bot.commands = new Collection();
bot.queue = [];
bot.error = null;
bot.spreadsheetID = null;
bot.dbClient = new DBUtils(bot, "./vc_configuration.db");
bot.covidAPI = new COVID19API({ fetch: nodeFetch });

// Setup configuration
config({
    path: `${__dirname}/../.env`,
});

// Setup db
bot.dbClient.preflight();

// Setup listeners
const lstTable = new Ascii("listeners");
lstTable.setHeading("Listener", "Load Status");
const listeners = readdirSync(`${__dirname}/event_listeners`).filter((v) =>
    v.endsWith(".js")
);
listeners.forEach((v) => {
    require(`${__dirname}/event_listeners/${v}`)(bot);
    lstTable.addRow(v, "Loaded");
});
console.log(lstTable.toString());

// Setup commands
const cmdTable = new Ascii("commands");
cmdTable.setHeading("Command", "Load Status");
bot.categories.forEach((dir) => {
    const commands = readdirSync(`${__dirname}/commands/${dir}`).filter((f) =>
        f.endsWith(".js")
    );
    commands.forEach((file) => {
        const pull = require(`${__dirname}/commands/${dir}/${file}`);
        if (pull.name) {
            bot.commands.set(pull.name, pull);
            cmdTable.addRow(file, "Loaded");
            if (pull.aliases && Array.isArray(pull.aliases)) {
                pull.aliases.forEach((alias) =>
                    bot.aliases.set(alias, pull.name)
                );
            }
        } else {
            cmdTable.addRow(file, "Error -> No name defined");
        }
    });
});
console.log(cmdTable.toString());

// Now login
bot.login(process.env.TOKEN);
