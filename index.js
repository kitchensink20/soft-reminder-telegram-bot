const express = require('express');
const axios = require('axios');
const path = require('path');
const bot = require('./bot');
const mysql = require('./database');

const port = process.env.PORT || 3000;
const expressApp = express();

expressApp.use(express.static('static'));
expressApp.use(express.json);

expressApp.listen(port, () => console.log(`Listening on ${port}.`));