const messages = require('./messages');
const path = require('path');
const database = require('./database');
require('dotenv').config();
const { Telegraf } = require('telegraf');
const { getTasksList } = require('./message-decorator');

const bot_token = process.env.BOT_TOKEN;

const bot = new Telegraf(bot_token);

bot.command('start', async ctx => {
    const user = ctx.from;
    await database.createUserIfNotExists(user.id, user.is_bot, user.first_name, user.last_name, user.username, user.language_code);
    bot.telegram.sendMessage(ctx.chat.id, messages.welcome);
});

bot.command('help', ctx => {
    bot.telegram.sendMessage(ctx.chat.id, messages.help);
});

bot.command('upcoming', async ctx => {
    try {
        const user = ctx.from;
        const tasks = await database.getAllTasksByOwnerId(user.id);
        if (tasks.length === 0) {
            bot.telegram.sendMessage(ctx.chat.id, messages.noTasks);
        } else {
            bot.telegram.sendMessage(ctx.chat.id, getTasksList(tasks));
        }
    } catch (error) {
        console.error(error);
        bot.telegram.sendMessage(ctx.chat.id, messages.error);
    }
});

bot.launch();

module.exports = bot;