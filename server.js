const axiosMod = require("axios").default,
      axios = axiosMod.create({
          baseURL: "https://discord.com/api/v8"
      }),
      TOKEN = "ODIyNzM3MDg3MzI5NTk5NTA5.YFWnnw.62lntOIegAk9cbxVs_32ycxz2m4",
      botAuth = `Bot ${TOKEN}`,
      WebSocket = require("websocket").client,
      ws = new WebSocket();

let seq = 0,
    session_id = null;

ws.on("connect", connection => {
    console.log("Connected!");

    connection.on("message", msg => {
        console.log("Got a message !");

        const data = JSON.parse(msg.utf8Data);

        switch (data.op) {
            case 1: {
                console.timeEnd(`heartbeat${seq-1}`);
                console.timeStamp(`heartbeat${seq-1}`);
                connection.sendUTF({
                    op: 1,
                    d: seq
                });
                seq++;
                console.time(`heartbeat${seq-1}`);
                break;
            }
            case 10: {
                console.log("Got a hello message! Beginning heartbeat messages");

                console.log("time is " + data.d.heartbeat_interval);
                connection.sendUTF({
                    op: 1,
                    d: null
                });
                console.log("sent first hb");
                console.time(`heartbeat${seq}`);
                seq++;
                
                setInterval(function() {
                    console.timeEnd(`heartbeat${seq-1}`);
                    console.timeStamp(`heartbeat${seq-1}`);
                    connection.sendUTF({
                        op: 1,
                        d: seq
                    });
                    seq++;
                    console.time(`heartbeat${seq-1}`);
                }, data.d.heartbeat_interval);

                // identify (op 2)
                connection.sendUTF({
                    op: 2,
                    d: {
                        token: TOKEN,
                        properties: {
                            $os: "win10",
                            $browser: "es6",
                            $device: "es6"
                        },
                        intents: 640
                    }
                });
                break;
            }
            default: {
                console.log("Got the following code: " + data.op);
                break;
            }
        }
    });
});

ws.connect("wss://gateway.discord.gg/?v=6&encoding=json");