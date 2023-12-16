const axios = require("axios");
const e = require("express");
const { response } = require("express");
const express = require("express");

const router = express.Router();

const API_KEY = "9bf25b372702bb91871f585a35997be0";

router.get("/", async (req,res) => {
    let link = `https://api.openweathermap.org/data/2.5/weather?lat=-7.2459717&lon=112.7378266&appid=${API_KEY}&units=metric`;

    let query = await axios.get(link);

    return res.status(200).send({
        weather : query.data.weather[0].main,
        icon : query.data.weather[0].icon,
        temperature : query.data.main.temp,
        humidity : query.data.main.humidity,
        wind_speed : query.data.wind.speed,
        sunrise : query.data.sys.sunrise,
        sunset : query.data.sys.sunset
    });
});

module.exports = router;