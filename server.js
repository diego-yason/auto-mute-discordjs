const express = require("express"),
      app = express(),
      PORT = 8080;

app.use(express.json());

app.post("/", (req, res) => {
    console.log("Received");
    if (req.body.type === 1) {
        res.status(200).send({
            type: 1
        });
    } else {
        res.status(401);
    }
});

app.get("/test", (req, res) => {
    res.status(200).send();
});

app.listen(PORT, () => {
    console.log("Server is online with port " + PORT);
});