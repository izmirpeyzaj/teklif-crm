const express = require('express');
const router = express.Router();
const db = require('../db_scripts/init');
const auth = require('./middleware');

// Get all proposals
router.get('/', auth, (req, res) => {
    const proposals = db.prepare('SELECT * FROM proposals WHERE user_id = ? ORDER BY date DESC').all(req.userId);
    res.json(proposals.map(p => ({ ...p, items: JSON.parse(p.items_json) })));
});

// Save proposal
router.post('/', auth, (req, res) => {
    const { code, customerName, totalAmount, items, date, status } = req.body;

    // Validation
    if (!customerName || customerName.trim() === '') return res.status(400).json({ message: 'Müşteri adı boş olamaz' });
    if (!code) return res.status(400).json({ message: 'Teklif kodu eksik' });

    const itemsJson = JSON.stringify(items || []);
    const stmt = db.prepare('INSERT INTO proposals (user_id, code, customer_name, total_amount, items_json, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(req.userId, code, customerName, totalAmount || 0, itemsJson, date || new Date().toISOString(), status || 'pending');
    res.status(201).json({ id: info.lastInsertRowid, code, customerName });
});

const { sendFeedbackEmail, sendReminderEmail } = require('../services/mail');

// ... (existing routes)

// Ask for proposal feedback via email
router.post('/ask-feedback', auth, async (req, res) => {
    const { customerEmail, customerName, projectName, total } = req.body;

    if (!customerEmail) return res.status(400).json({ message: 'Müşteri e-posta adresi eksik' });

    try {
        await sendFeedbackEmail(customerEmail, customerName, projectName, total);
        res.json({ message: 'E-posta başarıyla gönderildi' });
    } catch (err) {
        console.error('Email sending error:', err);
        res.status(500).json({ message: 'E-posta gönderilemedi: ' + err.message });
    }
});

// Send reminder email
router.post('/remind', auth, async (req, res) => {
    const { customerEmail, customerName, projectName, total } = req.body;

    if (!customerEmail) return res.status(400).json({ message: 'Müşteri e-posta adresi eksik' });

    try {
        await sendReminderEmail(customerEmail, customerName, projectName, total);
        res.json({ message: 'Hatırlatma e-postası başarıyla gönderildi' });
    } catch (err) {
        console.error('Reminder email error:', err);
        res.status(500).json({ message: 'Hatırlatma gönderilemedi: ' + err.message });
    }
});

module.exports = router;

