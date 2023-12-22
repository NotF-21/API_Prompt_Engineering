const axios = require("axios");
const express = require("express");

const translatte = require("translatte");
const keyword_extractor = require("keyword-extractor");

var stringSimilarity = require("string-similarity");

const router = express.Router();

const API_KEY = "9bf25b372702bb91871f585a35997be0";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""; // Replace with your actual API key

const cityMap = new Map();

cityMap.set("sby", `https://api.openweathermap.org/data/2.5/weather?lat=-7.2459717&lon=112.7378266&appid=${API_KEY}&units=metric`);
cityMap.set("bnd", `https://api.openweathermap.org/data/2.5/weather?lat=-7.4419024&lon=112.3956465&appid=${API_KEY}&units=metric`);
cityMap.set("jkt", `https://api.openweathermap.org/data/2.5/weather?lat=-6.1753942&lon=106.827183&appid=${API_KEY}&units=metric`);

const cityReq = new Map();
cityReq.set("sby", "Surabaya");
cityReq.set("bnd", "Bandung");
cityReq.set("jkt", "Jakarta");

const lanReq = new Map();
lanReq.set("id", "Bahasa Indonesia");
lanReq.set("en", "English");

const getCityWeather = async (city) => {
    const link = cityMap.get(city);
    const query = await axios.get(link);
    return {
        weather: query.data.weather[0].main,
        temperature: query.data.main.temp,
        wind_speed: query.data.wind.speed,
        humidity: query.data.main.humidity,
    };
};

const getCityImage = async (city) => {
    const link = cityMap.get(city);
    const query = await axios.get(link);
    return {
        image : query.data.weather[0].icon,
    };
};

router.get("/weather", async (req, res) => {
    try {
        const weatherData = await getCityWeather("sby");
        return res.status(200).send(weatherData);
    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).send('Internal Server Error');
    }
});

router.get("/weather/naration/:city/:lan", async (req, res) => {
    console.log(req.params);
    let {city, lan} = req.params;

    try {
        const weatherData = await getCityWeather(city);
        const image = await getCityImage(city);
        const requestData = {
            model: 'gpt-3.5-turbo-0613',
            messages: [
                { role: 'user', content: 'What is the weather like in the given city? Add some naration to better explain like recomendation and warning.' },
                {
                    role: 'assistant',
                    content: null,
                    function_call: {
                        name: 'get_current_weather',
                        arguments: JSON.stringify({
                            city: cityReq.get(city),
                            language: lanReq.get(lan),
                            weather: weatherData.weather,
                            temperature: weatherData.temperature,
                            wind_speed: weatherData.wind_speed,
                            humidity: weatherData.humidity,
                        }),
                    },
                },
                {
                    role: 'function',
                    name: 'get_current_weather',
                    content: JSON.stringify({
                        city: cityReq.get(city),
                        language: lanReq.get(lan),
                        weather: weatherData.weather,
                        temperature: weatherData.temperature,
                        wind_speed: weatherData.wind_speed,
                        humidity: weatherData.humidity,
                    }),
                },
            ],
            functions: [
                {
                    name: 'get_current_weather',
                    description: 'Get the current weather in a given location with explanation',
                    parameters: {
                        type: 'object',
                        properties: {
                            city: {
                                type: 'string',
                                description: 'The city, e.g., Surabaya, Bandung, Jakarta',
                            },
                            language: {
                                type: 'string',
                                description: 'The language for the response, either "English" or "Bahasa Indonesia"',
                            },
                            weather: {
                                type: 'string',
                                description: 'The description of weather',
                            },
                            temperature: {
                                type: 'string',
                                description: 'The temperature of weather, in Celcius',
                            },
                            wind_speed: {
                                type: 'string',
                                description: 'The wind speed, in meter per second',
                            },
                            humidity: {
                                type: 'string',
                                description: 'The humidity, in %',
                            },
                        },
                        required: ['city', 'language'],
                    },
                },
            ],
        };

        const query2 = await axios.post('https://api.openai.com/v1/chat/completions', requestData, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
        });

        return res.status(200).send({
            message : query2.data.choices[0].message.content,
            image : image.image,
        });
    } catch (error) {
        return res.status(500).send('Internal Server Error ' + error.toString() + process.env);
    }
});

router.post("/message", async (req,res) => {
    let {message, lan} = req.body;

    const weatherData = await getCityWeather("sby");

    const resMessage = await translatte(message, {
        to:'en',
    });

    const resArr = await keyword_extractor.extract(resMessage.text,{
        language:"english",
        remove_digits: true,
        return_changed_case:true,
        remove_duplicates: false
    });

    var foodMatch = await stringSimilarity.findBestMatch("food", resArr);

    if (foodMatch.bestMatch.rating>=0.75) {
        //PROCESS FOOD
        const requestData = {
            model: 'gpt-3.5-turbo-0613',
            messages: [
                { role: 'user', content: 'What is the suitable food recommendation for the given weather ?' },
                {
                    role: 'assistant',
                    content: null,
                    function_call: {
                        name: 'get_food_rec',
                        arguments: JSON.stringify({
                            city: cityReq.get("sby"),
                            language: lanReq.get(lan),
                            weather: weatherData.weather,
                            temperature: weatherData.temperature,
                            wind_speed: weatherData.wind_speed,
                            humidity: weatherData.humidity,
                        }),
                    },
                },
                {
                    role: 'function',
                    name: 'get_food_rec',
                    content: JSON.stringify({
                        city: cityReq.get("sby"),
                        language: lanReq.get(lan),
                        weather: weatherData.weather,
                        temperature: weatherData.temperature,
                        wind_speed: weatherData.wind_speed,
                        humidity: weatherData.humidity,
                    }),
                },
            ],
            functions: [
                {
                    name: 'get_food_rec',
                    description: 'Get the recommended food with the given location and weather.',
                    parameters: {
                        type: 'object',
                        properties: {
                            city: {
                                type: 'string',
                                description: 'The city, e.g., Surabaya, Bandung, Jakarta',
                            },
                            language: {
                                type: 'string',
                                description: 'The language for the response, either "English" or "Bahasa Indonesia"',
                            },
                            weather: {
                                type: 'string',
                                description: 'The description of weather',
                            },
                            temperature: {
                                type: 'string',
                                description: 'The temperature of weather, in Celcius',
                            },
                            wind_speed: {
                                type: 'string',
                                description: 'The wind speed, in meter per second',
                            },
                            humidity: {
                                type: 'string',
                                description: 'The humidity, in %',
                            },
                        },
                        required: ['city', 'language'],
                    },
                },
            ],
        };

        const query2 = await axios.post('https://api.openai.com/v1/chat/completions', requestData, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
        });

        return res.status(200).send({
            message : query2.data.choices[0].message.content,
        });
    } else {
        var drinkMatch = await stringSimilarity.findBestMatch("drink", resArr);
        
        if (drinkMatch.bestMatch.rating>=0.75) {
            const requestData = {
                model: 'gpt-3.5-turbo-0613',
                messages: [
                    { role: 'user', content: 'What is the suitable drink recommendation for the given weather ?' },
                    {
                        role: 'assistant',
                        content: null,
                        function_call: {
                            name: 'get_food_rec',
                            arguments: JSON.stringify({
                                city: cityReq.get("sby"),
                                language: lanReq.get(lan),
                                weather: weatherData.weather,
                                temperature: weatherData.temperature,
                                wind_speed: weatherData.wind_speed,
                                humidity: weatherData.humidity,
                            }),
                        },
                    },
                    {
                        role: 'function',
                        name: 'get_food_rec',
                        content: JSON.stringify({
                            city: cityReq.get("sby"),
                            language: lanReq.get(lan),
                            weather: weatherData.weather,
                            temperature: weatherData.temperature,
                            wind_speed: weatherData.wind_speed,
                            humidity: weatherData.humidity,
                        }),
                    },
                ],
                functions: [
                    {
                        name: 'get_food_rec',
                        description: 'Get the recommended food with the given location and weather.',
                        parameters: {
                            type: 'object',
                            properties: {
                                city: {
                                    type: 'string',
                                    description: 'The city, e.g., Surabaya, Bandung, Jakarta',
                                },
                                language: {
                                    type: 'string',
                                    description: 'The language for the response, either "English" or "Bahasa Indonesia"',
                                },
                                weather: {
                                    type: 'string',
                                    description: 'The description of weather',
                                },
                                temperature: {
                                    type: 'string',
                                    description: 'The temperature of weather, in Celcius',
                                },
                                wind_speed: {
                                    type: 'string',
                                    description: 'The wind speed, in meter per second',
                                },
                                humidity: {
                                    type: 'string',
                                    description: 'The humidity, in %',
                                },
                            },
                            required: ['city', 'language'],
                        },
                    },
                ],
            };
    
            const query2 = await axios.post('https://api.openai.com/v1/chat/completions', requestData, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
            });
    
            return res.status(200).send({
                message : query2.data.choices[0].message.content,
            });
        } else {
            return res.status(200).send("Please send your message clearer next time...");
        }
    }
});

module.exports = router;