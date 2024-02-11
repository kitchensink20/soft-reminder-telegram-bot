const messages = require('./messages');
const path = require('path');
const database = require('./service/database');
require('dotenv').config();
const { Telegraf, Scenes, session } = require('telegraf');
const { getEventsListAsMessage, isValidDate, isValidTime } = require('./service/data-converter');
const { BaseScene } = Scenes;

const bot_token = process.env.BOT_TOKEN;

const bot = new Telegraf(bot_token);

const addEventScene = new BaseScene('addEventScene');
const deleteEventScene = new BaseScene('deleteEventScene');

const stage = new Scenes.Stage([addEventScene, deleteEventScene]);
bot.use(session());
bot.use(stage.middleware());

deleteEventScene.enter(ctx => {
    ctx.reply(messages.requestEventId);
});

deleteEventScene.on('text', async ctx => {
    let operationResult = await database.deleteEventById(ctx.message.text, ctx.from.id);
    if (operationResult) {
        bot.telegram.sendMessage(ctx.chat.id, messages.eventDeleted);
    } else {
        bot.telegram.sendMessage(ctx.chat.id, messages.eventNotDeleted);
    }
    ctx.scene.leave();
});

addEventScene.enter(ctx => {
    ctx.reply(messages.requestEventDescription);
    ctx.session.step = 1;
});

addEventScene.on('text', async ctx => { 
    switch (ctx.session.step) {
        case 1: 
            ctx.session.description = ctx.message.text;
            ctx.reply(messages.requestEventDate);
            ctx.session.step++;
            break;
        case 2: 
            ctx.session.date = ctx.message.text;
            if (!isValidDate(ctx.session.date)) {
                ctx.reply(messages.invalidDate);
            } else {
                ctx.reply(messages.requestEventTime);
                ctx.session.step++;
            }
            break;
        case 3: 
            ctx.session.time = ctx.message.text;
            if (!isValidTime(ctx.session.time)) {
                ctx.reply(messages.invalidTime);
            } else {
                try {
                    console.log(ctx.from.id, ctx.session.description, ctx.session.date, ctx.session.time);
                    let operationResult = await database.createEvent(ctx.from.id, ctx.session.description, ctx.session.date, ctx.session.time);
                    if (operationResult) {
                        ctx.reply(messages.eventAdded);
                    } else {
                        ctx.reply(messages.error);
                    }
                } catch (error) {
                    console.error(error);
                    ctx.reply(messages.error);
                }
            }
            ctx.scene.leave();
            break;
        default:    
            ctx.reply(messages.error);
            ctx.scene.leave();
    }
});

bot.command('start', async ctx => {
    const user = ctx.from;
    await database.createUserIfNotExists(user.id, user.is_bot, user.first_name, user.last_name, user.username, user.language_code);
    bot.telegram.sendMessage(ctx.chat.id, messages.welcome);
});

bot.command('help', ctx => {
    bot.telegram.sendMessage(ctx.chat.id, messages.help);
});

bot.command('clear', async ctx => {
    try {
        const user = ctx.from;
        let eventsList = await database.getAllEventsByOwnerId(user.id);
        if (eventsList.length === 0) {
            bot.telegram.sendMessage(ctx.chat.id, messages.noEventsToDelete);
        } else {
            await database.deleteAllEventsByOwnerId(user.id);
            bot.telegram.sendMessage(ctx.chat.id, messages.allEventsDeleted);
        }
    } catch (error) {
        console.error(error);
        bot.telegram.sendMessage(ctx.chat.id, messages.error);
    }
});

bot.command('add', ctx => { ctx.scene.enter('addEventScene'); });

bot.command('delete', async ctx => { ctx.scene.enter('deleteEventScene'); });

bot.command('today', async ctx => { 
    try {
        const user = ctx.from;
        const events = await database.getAllEventsByOwnerId(user.id);
        const today = new Date();
        const todayEvents = events.filter(event => event.due_date.toDateString() === today.toDateString());
        bot.telegram.sendMessage(ctx.chat.id, getEventsListAsMessage(todayEvents));
    } catch (error) {
        console.error(error);
        bot.telegram.sendMessage(ctx.chat.id, messages.error);
    }
});

bot.command('tomorrow', async ctx => {
    try {
        const user = ctx.from;
        const events = await database.getAllEventsByOwnerId(user.id);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowEvents = events.filter(event => event.due_date.toDateString() === tomorrow.toDateString());
        bot.telegram.sendMessage(ctx.chat.id, getEventsListAsMessage(tomorrowEvents));
    } catch (error) {
        console.error(error);
        bot.telegram.sendMessage(ctx.chat.id, messages.error);
    }
});

bot.command('upcoming', async ctx => {
    try {
        const user = ctx.from;
        const events = await database.getAllEventsByOwnerId(user.id);
        const filteredEvents = events.filter(event => event.due_date > new Date() && event.active);
        bot.telegram.sendMessage(ctx.chat.id, getEventsListAsMessage(filteredEvents));
    } catch (error) {
        console.error(error);
        bot.telegram.sendMessage(ctx.chat.id, messages.error);
    }
});

bot.launch();
