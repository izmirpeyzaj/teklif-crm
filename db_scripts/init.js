const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'db', 'database.sqlite');
const db = new Database(dbPath);

// Create Tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        company_name TEXT,
        industry_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        price REAL,
        unit TEXT DEFAULT 'Adet',
        description TEXT,
        conditions TEXT,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS proposals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        code TEXT NOT NULL,
        customer_name TEXT,
        total_amount REAL,
        items_json TEXT,
        status TEXT DEFAULT 'pending',
        date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS kanban (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        list_name TEXT NOT NULL,
        cards_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );
`);

console.log('Database initialized successfully.');

// Migration: Add new columns to existing services table if missing
try {
    db.exec(`ALTER TABLE services ADD COLUMN unit TEXT DEFAULT 'Adet'`);
    console.log('Added unit column to services table');
} catch (e) { /* Column already exists */ }

try {
    db.exec(`ALTER TABLE services ADD COLUMN conditions TEXT`);
    console.log('Added conditions column to services table');
} catch (e) { /* Column already exists */ }

module.exports = db;
