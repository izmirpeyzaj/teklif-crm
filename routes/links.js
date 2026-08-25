const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db_scripts/init');
const { requireOrg } = require('../services/session');
const { rateLimiter } = require('../services/rate-limit');

// ---------------------------------------------------------------------------
// Onay baglantilarinin yonetimi (girisli taraf)
// ---------------------------------------------------------------------------
// Musterinin gordugu genel sayfa routes/public.js'te. Burasi ekibin tarafi:
// baglanti olustur, durumunu gor, iptal et.

router.use(requireOrg);

const olusturmaLimiti = rateLimiter({
    windowMs: 60 * 60 * 1000, max: 60,
    message: 'Cok fazla baglanti olusturuldu. Lutfen bir saat sonra tekrar deneyin.'
});

const VARSAYILAN_GUN = 30;
const MAX_HTML = 6 * 1024 * 1024;

function hash(t) {
    return crypto.createHash('sha256').update(String(t)).digest('hex');
}

function publicOrigin(req) {
    return process.env.APP_ORIGIN || `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}`;
}

// Olusturulan jeton yalnizca BU yanitta doner; veritabaninda ozeti duruyor.
// Kullanici baglantiyi kaybederse yenisini olusturur, eskisi iptal edilir.
router.post('/', olusturmaLimiti, (req, res) => {
    const { proposalCode, proposalId, customerName, projectName, total, html, days } = req.body || {};

    if (!proposalCode) return res.status(400).json({ message: 'Teklif kodu gerekli.' });
    if (typeof html !== 'string' || html.length < 50) {
        return res.status(400).json({ message: 'Teklif içeriği gerekli.' });
    }
    if (Buffer.byteLength(html, 'utf8') > MAX_HTML) {
        return res.status(413).json({ message: 'Teklif çok büyük. Görselleri küçültüp tekrar deneyin.' });
    }

    // ISTEMCIDEN GELEN HTML'E GUVENMIYORUZ demek dogru olmaz — bu HTML zaten
    // kullanicinin kendi teklifi ve yalnizca kendi musterisine gosterilecek.
    // Ama ic bilgi sizmasin diye data-internal isaretli her seyi burada da
    // temizliyoruz: istemci tarafi temizligi atlansa bile sunucu tutuyor.
    const temizHtml = html.replace(/<[^>]+\bdata-internal\b[^>]*>[\s\S]*?<\/[a-zA-Z]+>/g, '');

    const gun = Math.min(Math.max(parseInt(days) || VARSAYILAN_GUN, 1), 180);
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();

    try {
        db.transaction(() => {
            // Ayni teklif icin onceki baglantilari iptal et: tek gecerli
            // baglanti olsun, eski baglantiyi eline gecirmis biri karar
            // veremesin.
            db.prepare(`UPDATE proposal_links SET revoked_at = ?
                        WHERE org_id = ? AND proposal_code = ? AND revoked_at IS NULL AND decided_at IS NULL`)
              .run(now, req.user.org_id, String(proposalCode));

            db.prepare(`INSERT INTO proposal_links
                (token_hash, org_id, proposal_code, proposal_id, customer_name, project_name,
                 total, html, created_by, created_at, expires_at, origin)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .run(hash(token), req.user.org_id, String(proposalCode), proposalId ? String(proposalId) : null,
                   customerName || '', projectName || '', parseFloat(total) || 0, temizHtml,
                   req.user.id, now, now + gun * 24 * 60 * 60 * 1000, publicOrigin(req));
        })();

        res.json({ ok: true, link: publicOrigin(req) + '/t/' + token, expiresInDays: gun });
    } catch (err) {
        console.error('Baglanti olusturma hatasi:', err);
        res.status(500).json({ message: 'Bağlantı oluşturulamadı.' });
    }
});

// Ekibin gordugu durum listesi: acildi mi, karar verildi mi.
// Jeton DONMEZ — ozetten geri uretilemez zaten. Baglantiya tekrar ihtiyac
// duyulursa yenisi olusturulur.
router.get('/', (req, res) => {
    const rows = db.prepare(`
        SELECT l.proposal_code, l.customer_name, l.project_name, l.total,
               l.created_at, l.expires_at, l.opened_at, l.open_count,
               l.decided_at, l.decision, l.decision_note, l.signer_name, l.revoked_at,
               u.email AS creator_email, u.display_name AS creator_name
        FROM proposal_links l
        LEFT JOIN users u ON u.id = l.created_by
        WHERE l.org_id = ?
        ORDER BY l.created_at DESC
        LIMIT 200
    `).all(req.user.org_id);
    res.json({ links: rows });
});

// Tek bir teklifin baglanti durumu (imza dahil).
router.get('/:code', (req, res) => {
    const row = db.prepare(`
        SELECT proposal_code, created_at, expires_at, opened_at, open_count,
               decided_at, decision, decision_note, signer_name, signature, revoked_at
        FROM proposal_links
        WHERE org_id = ? AND proposal_code = ?
        ORDER BY created_at DESC LIMIT 1
    `).get(req.user.org_id, req.params.code);
    res.json({ link: row || null });
});

// Baglantiyi iptal et.
router.delete('/:code', (req, res) => {
    const r = db.prepare(`UPDATE proposal_links SET revoked_at = ?
                          WHERE org_id = ? AND proposal_code = ? AND revoked_at IS NULL`)
                .run(Date.now(), req.user.org_id, req.params.code);
    res.json({ ok: true, revoked: r.changes });
});

module.exports = router;
