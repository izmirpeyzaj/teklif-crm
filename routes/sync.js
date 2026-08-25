const express = require('express');
const router = express.Router();
const db = require('../db_scripts/init');
const { requireAuth } = require('../services/session');

// Her kullanicinin verisi kendi satirinda (A yolu: kullanici basina JSON blogu).
// Eskiden tek isletme vardi ve tek satir (sync_store id=1) yetiyordu; o satir
// artik ilk kayit olan hesaba devrediliyor (bkz. db_scripts/init.js).

router.use(requireAuth);

// Blogun ustune bir sinir koyuyoruz: veri tarayicidaki localStorage'dan geldigi
// icin dogal tavani zaten ~5-10MB, ama sunucu tarafinda da sinirsiz buyumesine
// izin vermek disk ve bellek acisindan dogru degil.
const MAX_BYTES = 8 * 1024 * 1024;

// GET /api/sync -> bu kullanicinin bulut anlik goruntusu
router.get('/', (req, res) => {
    try {
        const row = db.prepare('SELECT data, updated_at FROM user_sync WHERE user_id = ?')
            .get(req.user.id);
        if (!row) return res.json({ data: null, updatedAt: 0 });
        res.json({ data: row.data, updatedAt: row.updated_at || 0 });
    } catch (err) {
        res.status(500).json({ message: 'Senkron okunamadi: ' + err.message });
    }
});

// POST /api/sync -> anlik goruntuyu kaydet (upsert)
router.post('/', (req, res) => {
    try {
        const { data, updatedAt } = req.body || {};
        if (data == null) return res.status(400).json({ message: 'data gerekli' });

        const str = typeof data === 'string' ? data : JSON.stringify(data);
        if (Buffer.byteLength(str, 'utf8') > MAX_BYTES) {
            return res.status(413).json({
                message: 'Veriniz senkron sinirini asti (8MB). Kullanilmayan gorselleri veya eski teklifleri silin.'
            });
        }

        const ts = parseInt(updatedAt) || Date.now();
        db.prepare(`
            INSERT INTO user_sync (user_id, data, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
        `).run(req.user.id, str, ts);

        res.json({ ok: true, updatedAt: ts });
    } catch (err) {
        res.status(500).json({ message: 'Senkron kaydedilemedi: ' + err.message });
    }
});

module.exports = router;
