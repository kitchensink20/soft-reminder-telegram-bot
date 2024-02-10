const messages = require('./messages');
const path = require('path');
require('dotenv').config();
const { Telegraf } = require('telegraf');

const bot_token = process.env.BOT_TOKEN;

const bot = new Telegraf(bot_token);

bot.command('start', ctx => {
    console.log(ctx.from)
    bot.telegram.sendMessage(ctx.chat.id, messages.welcome);
});

bot.command('help', ctx => {
    bot.telegram.sendMessage(ctx.chat.id, messages.help);
});

bot.launch();

module.exports = bot;