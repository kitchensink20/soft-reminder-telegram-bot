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

async function getAllTasksByOwnerId(userId) {
    const [tasks] = await connection.query("SELECT * FROM tasks WHERE owner_id = ? ORDER BY due_date", [userId]);
    return tasks;
}

module.exports = {
    createUserIfNotExists,
    getAllTasksByOwnerId
};