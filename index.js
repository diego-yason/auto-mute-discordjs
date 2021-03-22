/* eslint-disable no-unused-vars */
const Discord = require(`discord.js`),
      client = new Discord.Client,
      TOKEN = `ODIyNzM3MDg3MzI5NTk5NTA5.YFWnnw.62lntOIegAk9cbxVs_32ycxz2m4`,
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

client.once(`ready`, () => {
    console.log(`Ready!`);
});

client.on(`raw`, e => {
    if (e.t === `INTERACTION_CREATE`) {
        const interaction = e.d;

        const data = e.d.data;
        const options = data.options; // note: this is an array

        const reply = message => {
            axios.post(`/interactions/${interaction.id}/${interaction.token}/callback`, {
                type: 3,
                data: {
                    // TODO: convert this into embed (see https://discord.com/developers/docs/resources/channel#embed-object)
                    // maybe make another function?
                    content: message
                }
            });
        };

        console.log("Got an interaction");

        switch (data.name) {
            case `ping`: {
                reply(`yeah I got your ping`);
                break;
            }
            case `add`: {
                // this command has been changed for dict
                axios.get(`/users/${options[0].value}`)
                     .then(res => {
                         dead.add({
                             username: res.data.username,
                             id: options[0].value 
                         }, options[0].value);
                     })
                     .catch((res) => {
                         console.error("Error");
                     });
                axios.put(`/guilds/${guild}/members/${options[0].value}/roles/${role}`);
                console.log(`Added ${dead.get(options[0].value).username} to dead`);
                reply(`Added ${dead.get(options[0].value).username} to the game!`);
                break;
            }
            case `remove`: {
                // this command has been changed to accept dict
                const user = options[0].value;
                if (dead.has(user)) {
                    reply(`Removed ${dead.get(user).username} from the game!`);
                    console.log(`Deleted ${dead.get(user).username} from dead and playerlist`);
                    dead.delete(user);
                } else if (alive.has(user)) {                    
                    console.log(`Deleted ${dead.get(user).username} from alive and playerlist`);
                    reply(`Removed ${dead.get(user).username} from the game!`);
                    alive.delete(user);
                } else {
                    reply(`User is not in the game.`);
                }
                break;
            }
            case `dead`: {
                // command now accepts dict
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
            case `undead`: {
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
            case `start-meeting`: {
                // now dict compliant
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
            case `end-meeting`: {
                // dict compliant
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
            case `restart`: 
            case `start`: {
                // ok with dict
                dead.forEach((value, index, array) => {
                    axios.patch(`/guilds/${guild}/members/${value.username}`, {
                        mute: true,
                        deaf: true
                    });
                    console.log(`Muted + deafened ${value.username}`);
                    
                    alive.add(value, value.id);
                    console.log(`Moved ${value.username} from dead to alive`);
                    dead.delete(index);
                });
                reply(`Started game.`);
                break;
            }
            case `end`: {
                // dict good
                alive.forEach((value, index, array) => {
                    axios.patch(`/guilds/${guild}/members/${value.id}`, {
                        mute: false,
                        deaf: false
                    });
                    console.log(`Unmuted and undeafened ${value.username}`);
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
            case `clear`: {
                alive.forEach((value, index, array) => {
                    axios.delete(`/guilds/${guild}/members/${value.id}/roles/${role}`);
                    console.log(`Removed ${value.username} from player list`);
                });
                dead.forEach((value, index, array) => {
                    axios.delete(`/guilds/${guild}/members/${value.id}/roles/${role}`);
                    console.log(`Removed ${value.username} from player list`);
                });
                alive.clear();
                dead.clear();
                reply(`Cleared the game list, check for any missed people!`);
            }
        }
    }
});

client.login(TOKEN);