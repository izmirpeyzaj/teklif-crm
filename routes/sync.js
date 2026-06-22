const express = require('express');
const router = express.Router();
const db = require('../db_scripts/init');

// Tek işletme (şifre kapısı) -> tek satır (id=1) tutuyoruz.
// Veri, frontend'in localStorage anlık görüntüsüdür (teklif_* anahtarları).

// GET /api/sync -> mevcut bulut anlık görüntüsü
router.get('/', (req, res) => {
    try {
        const row = db.prepare('SELECT data, updated_at FROM sync_store WHERE id = 1').get();
        if (!row) return res.json({ data: null, updatedAt: 0 });
        res.json({ data: row.data, updatedAt: row.updated_at || 0 });
    } catch (err) {
        res.status(500).json({ message: 'Senkron okunamadı: ' + err.message });
    }
});

// POST /api/sync -> anlık görüntüyü kaydet (upsert)
router.post('/', (req, res) => {
    try {
        const { data, updatedAt } = req.body || {};
        if (data == null) return res.status(400).json({ message: 'data gerekli' });
        const ts = parseInt(updatedAt) || Date.now();
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        db.prepare(`
            INSERT INTO sync_store (id, data, updated_at) VALUES (1, ?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
        `).run(str, ts);
        res.json({ ok: true, updatedAt: ts });
    } catch (err) {
        res.status(500).json({ message: 'Senkron kaydedilemedi: ' + err.message });
    }
});

module.exports = router;
