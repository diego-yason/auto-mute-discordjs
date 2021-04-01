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
      Dict = require(`collections/dict`);

class game {
    constructor(gameInfo) {
        this.alive = new Dict();
        this.dead = new Dict();
        this.map = gameInfo.map;
        this.imposters = gameInfo.imposters;
        this.visual_tasks = gameInfo.visual_tasks;
        this.common_task = gameInfo.common_task;
        this.short_task = gameInfo.short_task;
        this.long_task = gameInfo.long_task;
        this.confirm_ejects = gameInfo.confirm_ejects;
        this.emerengecy_meetings = gameInfo.emerengecy_meetings;
        this.anonymous_voting = gameInfo.anonymous_voting;
        this.emerengecy_cooldown = gameInfo.emerengecy_cooldown;
        this.discussion_time = gameInfo.discussion_time;
        this.voting_time = gameInfo.voting_time;
        this.player_speed = gameInfo.player_speed;
        this.crewmate_vision = gameInfo.crewmate_vision;
        this.imposter_vision = gameInfo.imposter_vision;
        this.kill_cooldown = gameInfo.kill_cooldown;
        this.kill_distance = gameInfo.kill_distance;
        this.task_bar_update = gameInfo.task_bar_update;
        this.roundCount = null; // to be changed with /end
    }
}

class player {
    constructor(id, username, color) {
        this.id = id;
        this.username = username;
        this.color = color;
        this.role = "crewmate"; // crewmate until declared imposter
        this.death = null; // possible options: null - alive | "voted" - was voted out | "killed" - imposter killed
        this.round = null; // what round did they die
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
    round = 0, // counting rounds
    ingame = false; 

const what = {
        guild: "797075885827424266",
        role: "814138012920709161"
    },
    main = {
        guild: "826481015702290483",
        role: "826482229990391809"
    }, 
    { guild,role } = main; // REMINDME this should switch when we're going to play


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
    emojis: {
        red: "<:Red:823821674104487936>",
        blue: "<:Blue:823821672737669151>",
        green: "<:Green:823821673379790908>",
        pink: "<:Pink:823821673160507422>",
        orange: "<:Orange:823821673294725150>",
        yellow: "<:Yellow:823821673315827732>",
        black: "<:Black:823821673010167848>",
        white: "<:White:823821672766898267>",
        purple: "<:Purple:823821673001517086>",
        brown: "<:Brown:823821672913436672>",
        cyan: "<:Cyan:823821673006497872>",
        lime: "<:Lime:823821673290661888>"
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
    gameInfo: null
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

client.once(`ready`, () => {
    console.log(`Ready!`);
});

client.on(`raw`, async e => {
    if (e.t === `INTERACTION_CREATE`) {
        await axios.post(`/interactions/${e.d.id}/${e.d.token}/callback`, {
            type: 5
        });

        const interaction = e.d,
              call_userid = interaction.member.user.id,
              data = e.d.data,
              options = data.options; // note: this is an array

        console.log("Got an interaction");

        const reply = message => {
            axios.patch(`/webhooks/822737087329599509/${interaction.token}/messages/@original`, {
                content: message
            })
                .finally("Send the message");
        };

        const exempt = ["new", "ping", "save-settings", "embed", "clear"];

        if (exempt.indexOf(data.name) === -1) {
            if (ref.gameInfo === null || ingame === false) {
                reply("Error: No game started, please use `/new` to start a game. Use `/save-settings` to update the current game settings.");
                return;
            }
        }

        switch (data.name) {
            case "ping": {
                reply(`yeah I got your ping`);
                break;
            }
            case "new": {
                if (ref.gameInfo === null) {
                    reply("Error: Game settings (without defaults) are still empty! Use `/save-settings`");
                    return;
                }
                ingame = true;
                reply("Game record created! You can now add people");
                break;
            }
            case "add": {
                if (ref.colors[options[1].value] !== null) {
                    reply(`Error: User ${ref.colors[options[1].value]} is already color ${options[1].value}!`);
                    return;
                }
                    const username = await getUsername(options[0].value);

                    ref.colors[options[1].value] = username;
                    ref.gameInfo.dead.add(new player(options[0].value, username, options[1].value), options[0].value);
                        
                    axios.put(`/guilds/${guild}/members/${options[0].value}/roles/${role}`)
                         .finally(() => { console.log("Placed the role"); });
                    
                    console.log(`Added ${ref.gameInfo.dead.get(options[0].value).username} to ref.gameInfo.dead`);
                    reply(`Added ${ref.gameInfo.dead.get(options[0].value).username} to the game!`);
                break;
            }
            case "remove": {
                const user = options[0].value;
                if (ref.gameInfo.dead.has(user)) {
                    reply(`Removed ${ref.gameInfo.dead.get(user).username} from the game!`);
                    ref.colors[ref.gameInfo.dead.get(user).color] = null;
                    console.log(`Deleted ${ref.gameInfo.dead.get(user).username} from ref.gameInfo.dead and playerlist`);
                    ref.gameInfo.dead.delete(user);
                } else if (ref.gameInfo.alive.has(user)) {                    
                    console.log(`Deleted ${ref.gameInfo.dead.get(user).username} from ref.gameInfo.alive and playerlist`);
                    ref.colors[ref.gameInfo.alive.get(user).color] = null;
                    reply(`Removed ${ref.gameInfo.dead.get(user).username} from the game!`);
                    ref.gameInfo.alive.delete(user);
                } else {
                    reply(`User is not in the game.`);
                }
                break;
            }
            case "dead": {
                const user = options[0].value;
                if (ref.gameInfo.alive.has(user)) {
                    ref.gameInfo.dead.add(ref.gameInfo.alive.get(user), user);
                    ref.gameInfo.alive.delete(user);

                    ref.gameInfo.dead.get(user).death = options[1].value;
                    ref.gameInfo.dead.get(user).round = round;

                    console.log(`Deleted ${ref.gameInfo.dead.get(user).username} from alive and added to dead`);
                    reply(`${ref.gameInfo.dead.get(user).username} has been marked dead.`);
                    if (status === 2) {
                        // in a meeting
                        axios.patch(`/guilds/${guild}/members/${user}`, {
                            deaf: false,
                            mute: true
                        });
                    } else {
                        // outside a meeting
                        axios.patch(`/guilds/${guild}/members/${user}`, {
                            deaf: false,
                            mute: false
                        });
                    }
                } else {
                    reply(`User is either already dead or not in game!`);
                }
                break;
            }
            case "undead": {
                const user = options[0].value;
                if (ref.gameInfo.dead.has(user)) {
                    ref.gameInfo.alive.add(ref.gameInfo.dead.get(user), user);
                    ref.gameInfo.dead.delete(user);

                    ref.gameInfo.alive.get(user).death = null;
                    ref.gameInfo.alive.get(user).round = null;

                    console.log(`Deleted ${ref.gameInfo.alive.get(user).username} from dead and added to alive`);
                    reply(`Undone the user's death.`);
                    if (status === 2) {
                        // in a meeting
                        axios.patch(`/guilds/${guild}/members/${user}`, {
                            deaf: false,
                            mute: false
                        });
                    } else {
                        // outside a meeting
                        axios.patch(`/guilds/${guild}/members/${user}`, {
                            deaf: true,
                            mute: true
                        });
                    }
                } else {
                    reply(`User is either still alive or not in game!`);
                }
                break;
            }
            case "start-meeting": {
                status = 2;
                ref.gameInfo.dead.forEach((value, index, array) => {
                    axios.patch(`/guilds/${guild}/members/${value.id}`, {
                        mute: true,
                        deaf: false
                    });
                    console.log(`Muted and undeafened ${value.username}`);
                });
                ref.gameInfo.alive.forEach((value, index, array) => {
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
                if (status != 2) {
                    reply("You aren't in a meeting!");
                    return;
                }
                status = 1;
                ref.gameInfo.alive.forEach((value, index, array) => {
                    axios.patch(`/guilds/${guild}/members/${value.id}`, {
                        mute: true,
                        deaf: true
                    });
                    console.log(`muted and deafened ${value.username}`);
                });
                ref.gameInfo.dead.forEach((value, index, array) => {
                    axios.patch(`/guilds/${guild}/members/${value.id}`, {
                        mute: false,
                        deaf: false
                    });
                    console.log(`Unmuted and undeafened ${value.username}`);
                });
                round++;
                reply(`Meeting ended. Now at round ${round}`);
                break;
            }
            case "start": {
                // ok with dict
                ref.gameInfo.dead.forEach((value, index, array) => {
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
                    
                    ref.gameInfo.alive.add(value, value.id);
                    console.log(`Moved ${value.username} from dead to alive`);
                    ref.gameInfo.dead.delete(index);
                });
                round = 1;
                reply(`Started game.`);
                break;
            }
            case "clear": {
                ref.gameInfo.alive.forEach((value, index, array) => {
                    ref.colors[value.color] = null;
                    axios.delete(`/guilds/${guild}/members/${value.id}/roles/${role}`);
                    console.log(`Removed ${value.username} from player list`);
                });
                ref.gameInfo.dead.forEach((value, index, array) => {
                    ref.colors[value.color] = null;
                    axios.delete(`/guilds/${guild}/members/${value.id}/roles/${role}`);
                    console.log(`Removed ${value.username} from player list`);
                });
                ref.gameInfo.alive.clear();
                ref.gameInfo.dead.clear();
                reply(`Cleared the game list, check for any missed people!`);
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
                        case "emergency_meetings":
                            if (options[i].value > 10 || options[i].value < 0) {
                                reply("Invalid `emergency_meetings`! You must have at least 1 (and max of 9) emergency meeting/s!");
                                return;
                            } else {
                                settings[options[i].name] = options[i].value * 100;
                            }
                            break;
                    }
                }

                ref.gameInfo = new game(settings);

                reply("Saved settings!");
                break;
            }
            case "embed": {
                // this is just for reference
                reply("Posted embed!");
                
                const info = new game({
                    map: "Airship", //
                    imposters: 2, //
                    visual_tasks: 1, //
                    common_task: 1, //
                    short_task: 3, //
                    long_task: 2, //
                    confirm_ejects: true, //
                    emerengecy_meetings: 1, //
                    anonymous_voting: false, //
                    emerengecy_cooldown: 15, //
                    discussion_time: 15, //
                    voting_time: 120, //
                    player_speed: 100, //
                    crewmate_vision: 100, //
                    imposter_vision: 150, //
                    kill_cooldown: 450, //
                    kill_distance: "medium", //
                    task_bar_update: "always",
                });

                const withS = (number, single) => {
                    if (number != 1) {
                        return single + "s";
                    } else {
                        return single;
                    }
                };

                const fieldArray = [];

                const players = [
                    {
                        username: "KingMarine",
                        color: "orange",
                        role: "imposter",
                        death: null,
                        round: null
                    },
                    {
                        username: "KingMarine",
                        color: "yellow",
                        role: "imposter",
                        death: "vote",
                        round: 4
                    },
                    {
                        username: "KingMarine",
                        color: "red",
                        role: "crewmate",
                        death: "vote",
                        round: 6
                    },
                    {
                        username: "KingMarine",
                        color: "blue",
                        role: "crewmate",
                        death: "imposter",
                        round: 2
                    },
                    {
                        username: "KingMarine",
                        color: "green",
                        role: "crewmate",
                        death: "imposter",
                        round: 2
                    },
                    {
                        username: "KingMarine",
                        color: "black",
                        role: "crewmate",
                        death: "vote",
                        round: 1
                    }
                ];

                const win = "IMPOSTER";

                let crewmateString = "",
                    imposterString = "";

                // players array is already assumed to be the player dict converted into an array
                players.sort((a, b) => {
                    if (a.round === null && b.round === null) {
                        return 0;
                    } else if (b.round === null) {
                        return -1;
                    } else if (a.round === null) {
                        return 1;
                    } else {
                        return a.round - b.round;
                    }
                });

                players.forEach((value, index, array) => {
                    let death;

                    if (value.round === null) {
                        death = "They didn't die.";
                    } else if (value.death === "imposter") {
                        death = "They were killed by an imposter at round " + value.round;
                    } else if (value.death === "v   ote") {
                        death = "The crew voted them off at round " + value.round;
                    } else {
                        death = "Hmm, something is off with this record. Contact KingMarine";
                    }

                    fieldArray.push({
                        name: `${value.username}'s Life`,
                        value: death,
                        inline: true
                    });

                    if (value.role === "crewmate") {
                        crewmateString = crewmateString + value.username + " " + ref.emojis[value.color] + "\n";
                    } else {
                        imposterString = imposterString + value.username + " " + ref.emojis[value.color] + "\n";
                    }
                });

                const embedarray = [
                    {
                        name: "General Game Settings",
                        value: `Map: ${info.map}\nConfirm Ejects: ${info.confirm_ejects}\nAnonymous Voting: ${info.anonymous_voting}`
                    },
                    {
                        name: "Task Settings",
                        value: `Common: ${info.common_task}\nShort: ${info.short_task}\nLong: ${info.long_task}`,
                        inline: true
                    },
                    {
                        name: "Speed & Vision Settings",
                        value: `Speed: ${info.player_speed / 100}x\nCrewmate Vision: ${info.crewmate_vision / 100}x\nImposter Vision: ${info.imposter_vision / 100}x`,
                        inline: true
                    },
                    {
                        name: "Imposter Settings",
                        value: `Imposter Count: ${info.imposters} ${withS(info.imposters, "Imposter")}\n Kill Cooldown: ${info.kill_cooldown / 10} seconds\n Kill Distance: ${info.kill_distance}`,
                        inline: true
                    },
                    {
                        name: "Misc. Settings",
                        value: `Emergency Meetings: ${info.emerengecy_meetings} ${withS(info.emerengecy_meetings, "meeting")}\nEmergency Cooldown: ${info.emerengecy_cooldown} seconds\nDiscussion Time: ${info.discussion_time} seconds\n Voting Time: ${info.voting_time} seconds\nTask Bar Update: ${info.task_bar_update}`,
                        inline: true
                    },
                    
                    {
                        name: "Crewmates",
                        value: crewmateString,
                        inline: true,
                    },
                    {
                        name: "Imposters",
                        value: imposterString,
                        inline: true
                    },
                    {
                        name: "Statistics",
                        value: `${4} ${withS(4, "round")}\n **${win} WIN**`
                    },
                    ...fieldArray
                ];

                axios.post(`/channels/814199629184106507/messages`, { embed: {
                        title: "Among Us Game Stats",
                        timestamp: new Date().toISOString(),
                        thumbnail: {
                            url: ref.images.map.airship,
                        },
                        fields: embedarray
                    }
                });
                break;
            }
            case "end": {
                if (options[0].value === false) {
                    reply("??? You kinda confirmed incorrectly (you placed false in the confirm arg)");
                    return;
                }

                const withS = (number, single) => {
                    if (number != 1) {
                        return single + "s";
                    } else {
                        return single;
                    }
                };

                const fieldArray = [];

                const win = options[0].value;

                let crewmateString = "",
                    imposterString = "";

                const info = ref.gameInfo;

                const players = [];
                info.dead.forEach((value, index, array) => {
                    players.push(value);
                });

                info.alive.forEach((value, index, array) => {
                    players.push(value);
                });
                      
                players.sort((a, b) => {
                    if (a.round === null && b.round === null) {
                        return 0;
                    } else if (b.round === null) {
                        return -1;
                    } else if (a.round === null) {
                        return 1;
                    } else {
                        return a.round - b.round;
                    }
                });

                players.forEach((value, index, array) => {
                    let death;
                    
                    if (value.round === null) {
                        death = "They didn't die.";
                    } else if (value.death === "imposter") {
                        death = "They were killed by an imposter at round " + value.round;
                    } else if (value.death === "vote") {
                        death = "The crew voted them off at round " + value.round;
                    } else {
                        death = "Hmm, something is off with this record. Contact KingMarine";
                    }

                    if (value.role === "crewmate") {
                        crewmateString = crewmateString + value.username + " " + ref.emojis[value.color] + "\n";
                    } else {
                        imposterString = imposterString + value.username + " " + ref.emojis[value.color] + "\n";
                    }

                    fieldArray.push({
                        name: `${value.username}'s Life`,
                        value: death,
                        inline: true
                    });
                });

                const embedarray = [
                    {
                        name: "General Game Settings",
                        value: `Map: ${info.map}\nConfirm Ejects: ${info.confirm_ejects}\nAnonymous Voting: ${info.anonymous_voting}`
                    },
                    {
                        name: "Task Settings",
                        value: `Common: ${info.common_task}\nShort: ${info.short_task}\nLong: ${info.long_task}`,
                        inline: true
                    },
                    {
                        name: "Speed & Vision Settings",
                        value: `Speed: ${info.player_speed / 100}x\nCrewmate Vision: ${info.crewmate_vision / 100}x\nImposter Vision: ${info.imposter_vision / 100}x`,
                        inline: true
                    },
                    {
                        name: "Imposter Settings",
                        value: `Imposter Count: ${info.imposters} ${withS(info.imposters, "Imposter")}\n Kill Cooldown: ${info.kill_cooldown / 10} seconds\n Kill Distance: ${info.kill_distance}`,
                        inline: true
                    },
                    {
                        name: "Misc. Settings",
                        value: `Emergency Meetings: ${info.emerengecy_meetings} ${withS(info.emerengecy_meetings, "meeting")}\nEmergency Cooldown: ${info.emerengecy_cooldown} seconds\nDiscussion Time: ${info.discussion_time} seconds\n Voting Time: ${info.voting_time} seconds\nTask Bar Update: ${info.task_bar_update}`,
                        inline: true
                    },
                    
                    {
                        name: "Crewmates",
                        value: crewmateString,
                        inline: true,
                    },
                    {
                        name: "Imposters",
                        value: imposterString,
                        inline: true
                    },
                    {
                        name: "Statistics",
                        value: `${4} ${withS(4, "round")}\n **${win} WIN**`
                    },
                    ...fieldArray
                ];

                /*axios.post(`/channels/814710147775594506/messages`, { embed: {
                        title: "Among Us Game Stats",
                        timestamp: new Date().toISOString(),
                        thumbnail: {
                            url: ref.images.map[info.map],
                        },
                        fields: embedarray
                    }
                });*/

                // clearing lists
                ref.gameInfo.alive.forEach((value, index, array) => {
                    axios.patch(`/guilds/${guild}/members/${value.id}`, {
                        mute: false,
                        deaf: false
                    });
                    console.log(`Unmuted and undeafened ${value.username}`);
                    ref.gameInfo.dead.add({ username: value.username, id: value.id}, value.id);
                    ref.gameInfo.alive.delete(value.id);
                });
                ref.gameInfo.dead.forEach((value, index, array) => {
                    axios.patch(`/guilds/${guild}/members/${value.id}`, {
                        mute: false,
                        deaf: false
                    });
                    console.log(`Unmuted and undeafened ${value.username}`);
                });
                ingame = false;
                status = 0;
                round = 0;
                reply("Game ended, removing all server voice restrictions. Use `/clear` to remove all among us roles or use `/start` to start a new game!");
                break;
            }
            case "imposter": 
            case "crewmate": {
                const game = ref.gameInfo,
                      role = data.name,
                      grammar = (role === "imposter") ? "an" : "a";

                if (game.alive.has(options[0].value)) {
                    game.alive.get(options[0].value).role = role;
                } else if (game.dead.has(options[0].value)) {
                    game.dead.get(options[0].value).role = role;
                } else {
                    reply("User isn't in the game!");
                    return;
                }
                reply(`User is marked as ${grammar} ${role}`);
                break;
            }
        }
    }
});

client.login(TOKEN);