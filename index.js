const Discord = require("discord.js");
const axios = require("axios").default;
const Dict = require("collections/dict");
const client = new Discord.Client();

const TOKEN = "ODIyNzM3MDg3MzI5NTk5NTA5.YFWnnw.62lntOIegAk9cbxVs_32ycxz2m4";
const apiLink = "https://discord.com/api/v8";
const applicationid = "822737087329599509";

const guild = {
    whatisthis: "797075885827424266"
};

const alive = new Dict();
const dead = new Dict(); 

require("./post.json").forEach((value, index, array) => {
    axios.post(`${apiLink}/applications/${applicationid}/guilds/${guild.whatisthis}/commands`, { value }, {
        headers: {
            authorization: `Bot ${TOKEN}`
        }
    })
         .catch(reason => {
         // TODO make a rate limit responder
             console.error(reason);
         })
         .then(() => {
             console.log(`POST of ${value.name} is sucessful`);
         });
});

client.once("ready", () => {
    console.log("Ready!");
});

client.on("raw", async e => {
    if (e.t === "INTERACTION_CREATE") {
        console.log("Received an interaction!");
        const data = e.d;

        const sendMessage = message => {
            axios.post(`${apiLink}/interactions/${data.id}/${data.token}/callback`, {
                type: 4,
                data: {
                    content: message,
                },
            })
            .catch(reason => {
                // TODO: make error handler
            });
        };

        switch (data.data.name) {
            case "mute":
                break;
            case "unmute":
                break;
            case "dead":
                break;
            case "undead":
                break;
            case "restart":
                break;
        }
    }
});

client.on("voiceStateUpdate", (oldState, newState) => {
    // should i still?
});

client.login(TOKEN);