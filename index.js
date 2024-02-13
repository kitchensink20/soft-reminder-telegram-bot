const messages = require('./messages');
const path = require('path');
const database = require('./service/database');
require('dotenv').config();
const { Telegraf, Scenes, session } = require('telegraf');
const { getEventsListAsMessage, isValidDate, isValidTime } = require('./service/data-converter');
const { BaseScene } = Scenes;

const bot_token = process.env.BOT_TOKEN;
const commands = ['/start', '/help', '/clear', '/add', '/delete', '/today', '/tomorrow', '/upcoming'];
const addTimeOptions = {
    reply_markup: JSON.stringify({
        inline_keyboard: [
            [{ text: 'Yes', callback_data: 'yes_add_time' }, 
            { text: 'No', callback_data: 'no_add_time' }]
        ]
    })
};
const addLocationOptions = {
    reply_markup: JSON.stringify({
        inline_keyboard: [
            [{ text: 'Yes', callback_data: 'yes_add_location' }, 
            { text: 'No', callback_data: 'no_add_location' }]
        ]
    })
};

const bot = new Telegraf(bot_token);

const addEventScene = new BaseScene('addEventScene');
const deleteEventScene = new BaseScene('deleteEventScene');

const stage = new Scenes.Stage([addEventScene, deleteEventScene]);
bot.use(session());
bot.use(stage.middleware());

deleteEventScene.enter(async ctx => {
    const tasks = await database.getAllActiveEventsByOwnerId(ctx.from.id);

    if (tasks.length === 0) { 
        ctx.reply(messages.noEventsToDelete);
        ctx.scene.leave();
    } else {    
        const options = {
            reply_markup: JSON.stringify({
                inline_keyboard: tasks.map(task => [{ text: task.description, callback_data: task.id }])
            })
        };
        ctx.reply(messages.whatTaskToDelete, options);
    }
});

deleteEventScene.on('callback_query', async ctx => {
    let operationResult = await database.deleteEventById(ctx.callbackQuery.data, ctx.from.id);
    if (operationResult) {
        ctx.reply(messages.eventDeleted);
    } else {
        ctx.reply(messages.eventNotDeleted);
    }
    ctx.scene.leave();
});

addEventScene.enter(ctx => {
    ctx.reply(messages.requestEventDescription);
    ctx.session.step = 1;
});

addEventScene.on('text', async ctx => { 
    if (commands.includes(ctx.message.text)) {
        ctx.scene.leave();
        return;
    }

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
                ctx.reply(messages.doYouNeedTimeQuestion, addTimeOptions);
                ctx.session.step++;
            }
            break;
        case 3:
            ctx.session.time = ctx.message.text; 
            if (!isValidTime(ctx.session.time)) {
                ctx.reply(messages.invalidTime);
            } else {
                ctx.reply(messages.addLocationQuestion, addLocationOptions);
                ctx.session.step++;
            }
            break;
        case 4:
            ctx.session.location = ctx.message.text;
            await createEvent(ctx, ctx.from.id, ctx.session.description, ctx.session.date, ctx.session.time, ctx.session.location);
            ctx.scene.leave();
            break;
        default:    
            ctx.reply(messages.error);
            ctx.scene.leave();
    }
});

addEventScene.on('callback_query', async ctx => {  
    switch (ctx.callbackQuery.data) {
        case 'yes_add_time':
            ctx.reply(messages.requestEventTime);
            break;
        case 'no_add_time':
            ctx.reply(messages.addLocationQuestion, addLocationOptions);
            ctx.session.step++;
            break;
        case 'yes_add_location':
            ctx.reply(messages.requestEventLocation);
            break;
        case 'no_add_location':
            await createEvent(ctx, ctx.from.id, ctx.session.description, ctx.session.date, ctx.session.time);
            ctx.scene.leave();
            break;
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
        const events = await database.getAllTodayEventsByOwnerId(user.id);
        const today = new Date();
        const todayEvents = events.filter(event => event.due_date.toDateString() === today.toDateString());
        if (todayEvents.length === 0) {
            bot.telegram.sendMessage(ctx.chat.id, messages.noEventsToday);
        }  else {
            bot.telegram.sendMessage(ctx.chat.id, messages.upcomingEvents + getEventsListAsMessage(todayEvents));
        }
    } catch (error) {
        console.error(error);
        bot.telegram.sendMessage(ctx.chat.id, messages.error);
    }
});

bot.command('tomorrow', async ctx => {
    try {
        const user = ctx.from;
        const events = await database.getAllTomorrowEventsByOwnerId(user.id);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowEvents = events.filter(event => event.due_date.toDateString() === tomorrow.toDateString());
        if (tomorrowEvents.length === 0) {
            bot.telegram.sendMessage(ctx.chat.id, messages.noEventsTomorrow);
        } else {
            bot.telegram.sendMessage(ctx.chat.id, messages.upcomingEvents + getEventsListAsMessage(tomorrowEvents));
        }
    } catch (error) {
        console.error(error);
        bot.telegram.sendMessage(ctx.chat.id, messages.error);
    }
});

bot.command('upcoming', async ctx => {
    try {
        const user = ctx.from;
        const events = await database.getAllActiveEventsByOwnerId(user.id);
        const filteredEvents = events.filter(event => event.due_date > new Date() && event.active);
        bot.telegram.sendMessage(ctx.chat.id, getEventsListAsMessage(filteredEvents));
    } catch (error) {
        console.error(error);
        bot.telegram.sendMessage(ctx.chat.id, messages.error);
    }
});

bot.launch();

async function createEvent(ctx) {
    try {
        let operationResult = await database.createEvent(ctx.from.id, ctx.session.description, ctx.session.date, ctx.session.time, ctx.session.location);
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

async function deactivateAllPastEvents() {
    await database.deactivateAllPastEvents();
}

async function notifyAllUsersAboutTomorrowEvents() {
    const users = await database.getAllUsers();
    users.forEach(async user => {
        const events = await database.getAllTomorrowEventsByOwnerId(user.id);
        if (events.length > 0) {
            bot.telegram.sendMessage(user.id, messages.eventsReminder + getEventsListAsMessage(events));
        }
    });
}

setInterval(deactivateAllPastEvents, 86400000); 
setInterval(notifyAllUsersAboutTomorrowEvents, 86400000);


