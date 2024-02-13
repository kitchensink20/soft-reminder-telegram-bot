const messages = require("../messages");

function getEventsListAsMessage(events) {
    let strEventsList = events
        .map(event => `🖇️Event: ${event.description}\n📅Date: ${trimDate(event.due_date)}` + (event.due_time ? ("\n🕗Time: " + event.due_time) : "") + (event.location ? ("\n📍Location: " + event.location) : ""));
    if (strEventsList.length === 0) {    
        return null;
    }  else {
        return strEventsList.join("\n\n");
    }
}

function trimDate(date) {
    return date.toString().split("00:00:00")[0];
}

function isValidTime(timeString) {
    const regex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!regex.test(timeString)) {
        return false; 
    }

    return true;
}

function isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
        return false; 
    }

    const parts = dateString.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        return false; 
    }

    return true;
}

module.exports = { 
    getEventsListAsMessage,
    isValidDate,
    isValidTime
};