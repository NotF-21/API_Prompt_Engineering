const express = require("express");
require('dotenv').config();

const app = express();
app.set("port", 3000);
app.use(express.json())
app.use(express.urlencoded({extended: true}));

const routes = require("./routes");

app.use("/", routes);

app.listen(app.get("port"), () => {
    console.log(`Server started at http://localhost:${app.get("port")}`);
});

module.exports = app;