/* eslint-disable no-unused-vars */
const Discord = require(`discord.js`),
      client = new Discord.Client,
      { TOKEN } = require("./key.json"),
      axios = require(`axios`).default.create({
          baseURL: `https://discord.com/api/v8`,
          headers: {
              authorization: `Bot ${TOKEN}`
          }
      }),
      Dict = require(`collections/dict`),
      alive = new Dict(),
      dead = new Dict(),
      guild = `797075885827424266`,
      role = `814138012920709161`;

class player {
    // TODO player and game class objects
    constructor(id, color) {
        this.id = id;
        this.color = color;
    }
}

/*
    Possible States
        inactive / 0
            DEFAULT STATE
            anyone can talk
        ingame / 1
            only ghosts can talk | alive is deafened/muted
        meeting / 2
            alive can talk | ghosts are muted
*/
let status = 0, // for instant voice setting update
    round = 0; // counting rounds

const ref = {
    colors: {
        red: null,
        blue: null,
        green: null,
        pink: null,
        orange: null,
        yellow: null,
        black: null,
        white: null,
        purple: null,
        brown: null,
        cyan: null,
        lime: null
    },
    images: {
        map: {
            polus: "https://media.discordapp.net/attachments/823841770378100756/823841840159522836/Polus.png",
            airship: "https://media.discordapp.net/attachments/823841770378100756/823841845141962782/The_Airship.png",
            skeld: "https://media.discordapp.net/attachments/823841770378100756/823841846946037780/The_Skeld.png",
            mira: "https://media.discordapp.net/attachments/823841770378100756/823841963370348574/MIRA_HQ.png"
        },
        tan: "https://media.discordapp.net/attachments/823841770378100756/823841960774205460/Tan.png",
    },
    gameInfo: {}
};

function getUsername(id) {
    return new Promise((resolve, reject) => {
        axios.get(`/users/${id}`)
             .then(res => {
                 resolve(res.data.username);
             })
             .catch((res) => {
                 console.error("Error");
                 reject(res.status);
             });
    });
}

// TODO make embed

client.once(`ready`, () => {
    console.log(`Ready!`);
});

client.on(`raw`, async e => {
    if (e.t === `INTERACTION_CREATE`) {
        const interaction = e.d;

        const data = e.d.data;
        const options = data.options; // note: this is an array

        const reply = message => {
            axios.post(`/interactions/${interaction.id}/${interaction.token}/callback`, {
                type: 4,
                data: {
                    // TODO: convert this into embed (see https://discord.com/developers/docs/resources/channel#embed-object)
                    // maybe make another function?
                    content: message,
                }
            })
                 .finally("Send the message");
        };

        const embed = data => {
            axios.post(`/channels/814710147775594506/messages`, {
                embed: data 
            });
        };

        console.log("Got an interaction");

        switch (data.name) {
            case "ping": {
                reply(`yeah I got your ping`);
                break;
            }
            case "add": {
                if (ref.colors[options[1].value] === null) {
                    const username = await getUsername(options[0].value);

                    ref.colors[options[1].value] = username;
                    dead.add({
                        username: username,
                        id: options[0].value,
                        color: options[1].value // TODO check to make color unique per person
                        }, options[0].value);
                        
                        axios.put(`/guilds/${guild}/members/${options[0].value}/roles/${role}`)
                             .finally(() => { console.log("Placed the role"); });
                        
                        console.log(`Added ${dead.get(options[0].value).username} to dead`);
                        reply(`Added ${dead.get(options[0].value).username} to the game!`);
                } else {
                    reply(`Error: User ${ref.colors[options[1].value]} is already color ${options[1].value}!`);
                }
                break;
            }
            case "remove": {
                const user = options[0].value;
                if (dead.has(user)) {
                    reply(`Removed ${dead.get(user).username} from the game!`);
                    ref.colors[dead.get(user).color] = null;
                    console.log(`Deleted ${dead.get(user).username} from dead and playerlist`);
                    dead.delete(user);
                } else if (alive.has(user)) {                    
                    console.log(`Deleted ${dead.get(user).username} from alive and playerlist`);
                    ref.colors[alive.get(user).color] = null;
                    reply(`Removed ${dead.get(user).username} from the game!`);
                    alive.delete(user);
                } else {
                    reply(`User is not in the game.`);
                }
                break;
            }
            case "dead": {
                const user = options[0].value;
                if (alive.has(user)) {
                    dead.add(alive.get(user), user);
                    alive.delete(user);
                    console.log(`Deleted ${dead.get(user).username} from alive and added to dead`);
                    reply(`${dead.get(user).username} has been marked dead.`);
                } else {
                    reply(`User is either already dead or not in game!`);
                }
                break;
            }
            case "undead": {
                const user = options[0].value;
                if (dead.has(user)) {
                    alive.add(dead.get(user), user);
                    dead.delete(user);
                    console.log(`Deleted ${alive.get(user).username} from dead and added to alive`);
                    reply(`Undone the user's death.`);
                } else {
                    reply(`User is either still alive or not in game!`);
                }
                break;
            }
            case "start-meeting": {
                status = 2;
                dead.forEach((value, index, array) => {
                    axios.patch(`/guilds/${guild}/members/${value.id}`, {
                        mute: true,
                        deaf: false
                    });
                    console.log(`Muted and undeafened ${value.username}`);
                });
                alive.forEach((value, index, array) => {
                    axios.patch(`/guilds/${guild}/members/${value.id}`, {
                        mute: false,
                        deaf: false
                    });
                    console.log(`Unmuted and undeafened ${value.username}`);
                });
                reply(`Meeting started.`);
                break;
            }
            case "end-meeting": {
                status = 1;
                alive.forEach((value, index, array) => {
                    axios.patch(`/guilds/${guild}/members/${value.id}`, {
                        mute: true,
                        deaf: true
                    });
                    console.log(`muted and deafened ${value.username}`);
                });
                dead.forEach((value, index, array) => {
                    axios.patch(`/guilds/${guild}/members/${value.id}`, {
                        mute: false,
                        deaf: false
                    });
                    console.log(`Unmuted and undeafened ${value.username}`);
                });
                reply(`Meeting ended.`);
                break;
            }
            case "restart": 
            case "start": {
                // ok with dict
                dead.forEach((value, index, array) => {
                    axios.patch(`/guilds/${guild}/members/${value.id}`, {
                        mute: true,
                        deaf: true
                    })
                         .catch(res => {
                             console.error(res.status);
                         })
                         .then(res => {
                             console.log(`Muted and deafened ${value.username}`);
                         });
                    
                    alive.add(value, value.id);
                    console.log(`Moved ${value.username} from dead to alive`);
                    dead.delete(index);
                });
                reply(`Started game.`);
                break;
            }
            case "end": {
                alive.forEach((value, index, array) => {
                    axios.patch(`/guilds/${guild}/members/${value.id}`, {
                        mute: false,
                        deaf: false
                    });
                    console.log(`Unmuted and undeafened ${value.username}`);
                    dead.add({ username: value.username, id: value.id}, value.id);
                    alive.delete(value.id);
                });
                dead.forEach((value, index, array) => {
                    axios.patch(`/guilds/${guild}/members/${value.id}`, {
                        mute: false,
                        deaf: false
                    });
                    console.log(`Unmuted and undeafened ${value.username}`);
                });
                reply("Game ended, removing all server voice restrictions. Use `/clear` to remove all among us roles.");
                break;
            }
            case "clear": {
                alive.forEach((value, index, array) => {
                    ref.colors[value.color] = null;
                    axios.delete(`/guilds/${guild}/members/${value.id}/roles/${role}`);
                    console.log(`Removed ${value.username} from player list`);
                });
                dead.forEach((value, index, array) => {
                    ref.colors[value.color] = null;
                    axios.delete(`/guilds/${guild}/members/${value.id}/roles/${role}`);
                    console.log(`Removed ${value.username} from player list`);
                });
                alive.clear();
                dead.clear();
                reply(`Cleared the game list, check for any missed people!`);
                break;
            }
            case "admin-create-role": {
                const hexToNum = hex => {
                    return parseInt(hex.replace("#", ""), 16);
                };
                break;
            }
            case "save-settings": {
                const settings = {
                    map: null,
                    imposters: null,
                    visual_tasks: null,
                    common_task: null,
                    short_task: null,
                    long_task: null,
                    confirm_ejects: true,
                    emerengecy_meetings: 1,
                    anonymous_voting: false,
                    emerengecy_cooldown: 15,
                    discussion_time: 15,
                    voting_time: 120,
                    player_speed: 100,
                    crewmate_vision: 100,
                    imposter_vision: 150,
                    kill_cooldown: 450,
                    kill_distance: "medium",
                    task_bar_update: "always",
                };

                for (let i = 0; i < options.length; i++) {
                    switch (options[i].name) {
                        default:
                            settings[options[i].name] = options[i].value;
                            break;
                        case "kill_cooldown":
                        // reason: for kill cooldown, divide by 10
                            settings[options[i].name] = options[i].value * 10;
                            break;
                        case "player_speed":
                        case "crewmate_vision":
                        case "imposter_vision":
                            // reason: for speed and vision, you have to divide by 100 to get it correct
                            settings[options[i].name] = options[i].value * 100;
                            break;
                    }
                }

                ref.gameInfo = settings;

                reply("Saved settings!");
            }
        }
    }
});

client.login(TOKEN);