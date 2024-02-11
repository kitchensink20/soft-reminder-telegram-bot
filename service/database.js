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

async function createEvent(ownerId, description, dueDate, dueTime) {
    const [result] = await connection.query("INSERT INTO events (owner_id, description, due_date, due_time) VALUES (?, ?, ?, ?)", [ownerId, description, dueDate, dueTime]);
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

async function getAllEventsByOwnerId(userId) {
    const [events] = await connection.query("SELECT * FROM events WHERE owner_id = ? ORDER BY due_date", [userId]);
    return events;
}

async function deleteAllEventsByOwnerId(userId) {
    await connection.query("DELETE FROM events WHERE owner_id = ?", [userId]);
}

module.exports = {
    createUserIfNotExists,
    getAllEventsByOwnerId,
    deleteAllEventsByOwnerId,
    createEvent,
    deleteEventById
};