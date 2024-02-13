const e = require('express');
const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
}).promise();

async function createUserIfNotExists(userId, is_bot, first_name, last_name, username, language_code) {
    const rows = await connection.query("SELECT * FROM users WHERE id = ?", [userId]);
    if (rows[0].length === 0) {
        await connection.query("INSERT INTO users (id, is_bot, first_name, last_name, username, language_code) VALUES (?, ?, ?, ?, ?, ?)", [userId, is_bot, first_name, last_name, username, language_code]);
    }
}

async function getAllUsers() {
    const [users] = await connection.query("SELECT * FROM users");
    return users;
}

async function createEvent(ownerId, description, dueDate, dueTime = null, location = null) {
    const [result] = await connection.query("INSERT INTO events (owner_id, description, due_date, due_time, location) VALUES (?, ?, ?, ?, ?)", [ownerId, description, dueDate, dueTime, location]);
    return result.affectedRows > 0;
}

async function deleteEventById(eventId, ownerId) {
    let [event] = await connection.query("SELECT * FROM events WHERE id = ?", [eventId]); 

    if (event == undefined || event[0].owner_id != ownerId) {
        return false;
    } else {
        await connection.query("DELETE FROM events WHERE id = ?", [eventId]);
        return true;
    }
}

async function getAllActiveEventsByOwnerId(userId) {
    const [events] = await connection.query("SELECT * FROM events WHERE owner_id = ? AND active = 1 ORDER BY due_date", [userId]);
    return events;
}

async function getAllEventsByOwnerId(userId) {  
    const [events] = await connection.query("SELECT * FROM events WHERE owner_id = ? ORDER BY due_date", [userId]);
    return events;
}

async function getAllTodayEventsByOwnerId(userId) {
    const [events] = await connection.query("SELECT * FROM events WHERE owner_id = ? AND due_date = CURDATE() ORDER BY due_date", [userId]);
    return events;
}

async function getAllTomorrowEventsByOwnerId(userId) {  
    const [events] = await connection.query("SELECT * FROM events WHERE owner_id = ? AND due_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY) ORDER BY due_date", [userId]);
    return events;
}

async function deleteAllEventsByOwnerId(userId) {
    await connection.query("DELETE FROM events WHERE owner_id = ?", [userId]);
}

async function deactivateAllPastEvents() {
    await connection.query("UPDATE events SET active = 0 WHERE due_date < CURDATE()");
}

module.exports = {
    createUserIfNotExists,
    getAllUsers,
    getAllActiveEventsByOwnerId,
    getAllEventsByOwnerId,
    getAllTomorrowEventsByOwnerId,
    getAllTodayEventsByOwnerId,
    deleteAllEventsByOwnerId,
    createEvent,
    deleteEventById,
    deactivateAllPastEvents
};