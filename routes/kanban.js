const express = require('express');
const router = express.Router();
const db = require('../db_scripts/init');
const auth = require('./middleware');

// Get Kanban state
router.get('/', auth, (req, res) => {
    const kanban = db.prepare('SELECT * FROM kanban WHERE user_id = ?').all(req.userId);
    res.json(kanban.map(k => ({ id: k.id, list_name: k.list_name, cards: JSON.parse(k.cards_json || '[]') })));
});

// Save Kanban state (overwrite/sync)
router.post('/sync', auth, (req, res) => {
    const { lists } = req.body; // Array of { list_name, cards }

    db.transaction(() => {
        // Clear old state for this user
        db.prepare('DELETE FROM kanban WHERE user_id = ?').run(req.userId);

        const stmt = db.prepare('INSERT INTO kanban (user_id, list_name, cards_json) VALUES (?, ?, ?)');
        for (const list of lists) {
            stmt.run(req.userId, list.list_name, JSON.stringify(list.cards));
        }
    })();

    res.json({ message: 'Kanban synced' });
});

module.exports = router;
