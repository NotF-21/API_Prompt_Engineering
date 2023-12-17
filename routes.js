const axios = require("axios");
const express = require("express");

const router = express.Router();

const API_KEY = "9bf25b372702bb91871f585a35997be0";
const OPENAI_API_KEY = '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'; // Replace with your actual API key

const getCurrentWeather = async () => {
    const link = `https://api.openweathermap.org/data/2.5/weather?lat=-7.2459717&lon=112.7378266&appid=${API_KEY}&units=metric`;
    const query = await axios.get(link);
    return {
        weather: query.data.weather[0].main,
        temperature: query.data.main.temp,
        wind_speed: query.data.wind.speed,
        humidity: query.data.main.humidity,
    };
};

const getImage = async () => {
    const link = `https://api.openweathermap.org/data/2.5/weather?lat=-7.2459717&lon=112.7378266&appid=${API_KEY}&units=metric`;
    const query = await axios.get(link);
    return {
        image : query.data.weather[0].icon,
    };
};

router.get("/", async (req, res) => {
    try {
        const weatherData = await getCurrentWeather();
        return res.status(200).send(weatherData);
    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).send('Internal Server Error');
    }
});

router.get("/naration", async (req, res) => {
    try {
        const weatherData = await getCurrentWeather();
        const image = await getImage();
        const requestData = {
            model: 'gpt-3.5-turbo-0613',
            messages: [
                { role: 'user', content: 'What is the weather like in Surabaya? Add some naration to better explain.' },
                {
                    role: 'assistant',
                    content: null,
                    function_call: {
                        name: 'get_current_weather',
                        arguments: JSON.stringify(weatherData),
                    },
                },
                {
                    role: 'function',
                    name: 'get_current_weather',
                    content: JSON.stringify(weatherData),
                },
            ],
            functions: [
                {
                    name: 'get_current_weather',
                    description: 'Get the current weather in a given location with explanation',
                    parameters: {
                        type: 'object',
                        properties: {
                            location: {
                                type: 'string',
                                description: 'The city and state, e.g. San Francisco, CA',
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
                        required: ['location'],
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
        return res.status(500).send('Internal Server Error' + error.toString());
    }
});

module.exports = router;