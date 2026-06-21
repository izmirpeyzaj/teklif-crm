const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'db', 'db_data.json');

// Initial state
let data = {
    users: [],
    services: [],
    proposals: [],
    kanban: []
};

// Load data if exists
if (fs.existsSync(DB_FILE)) {
    try {
        data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        console.error('Error loading DB file, starting fresh');
    }
}

const save = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

module.exports = {
    prepare: (query) => ({
        run: (...args) => {
            // Simplified mock run
            console.log('Mock DB Run:', query, args);
            save();
            return { lastInsertRowid: Date.now() };
        },
        get: (...args) => {
            console.log('Mock DB Get:', query, args);
            return null; // Return empty for now
        },
        all: (...args) => {
            console.log('Mock DB All:', query, args);
            return [];
        }
    }),
    exec: (query) => {
        console.log('Mock DB Exec:', query);
        save();
    }
};
