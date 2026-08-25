const express = require('express');
const router = express.Router();
const db = require('../db_scripts/init');
const crypto = require('crypto');
const session = require('../services/session');
const mail = require('../services/mail');
const { rateLimiter } = require('../services/rate-limit');

const { requireOrg, requireOwner } = session;

// Davet maili bizim Resend kotamizdan gidiyor; kotuye kullanimi sinirla.
const inviteLimiter = rateLimiter({
    windowMs: 60 * 60 * 1000, max: 10,
    message: 'Cok fazla davet gonderildi. Lutfen bir saat sonra tekrar deneyin.'
});

const INVITE_TTL = 7 * 24 * 60 * 60 * 1000;   // 7 gun

function hash(t) {
    return crypto.createHash('sha256').update(t).digest('hex');
}

function publicOrigin(req) {
    return process.env.APP_ORIGIN || `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}`;
}

// ---------------------------------------------------------------------------
// Daveti kabul etmek icin oturum ZORUNLU DEGIL sayilmali mi?
// ---------------------------------------------------------------------------
// Hayir: davet edilen kisi once hesap acmali/girmeli, sonra kabul etmeli.
// Aksi halde davet baglantisini ele geciren biri hesapsiz olarak ekibin
// verisine erisebilirdi. Bu yuzden /accept requireOrg ISTEMEZ ama giris ister.
router.post('/accept', async (req, res) => {
    const user = session.currentUser(req);
    if (!user) {
        return res.status(401).json({ message: 'Daveti kabul etmek icin once giris yapin.', needsLogin: true });
    }

    const token = (req.body || {}).token;
    if (!token) return res.status(400).json({ message: 'Davet kodu gerekli.' });

    const inv = db.prepare('SELECT * FROM org_invites WHERE token_hash = ?').get(hash(String(token)));
    if (!inv || inv.accepted_at || inv.expires_at < Date.now()) {
        return res.status(400).json({ message: 'Davet gecersiz veya suresi dolmus.' });
    }

    // Davet belirli bir e-postaya gonderildi; baskasi kabul edemesin.
    if (String(inv.email).toLowerCase() !== String(user.email).toLowerCase()) {
        return res.status(403).json({
            message: `Bu davet ${inv.email} adresine gonderilmis. Lutfen o hesapla giris yapin.`
        });
    }

    try {
        const now = Date.now();
        db.transaction(() => {
            // Kullanici zaten baska bir ekipteyse oradan cikar. Tek ekip
            // kurali: veri org bazli oldugu icin bir kisi ayni anda iki ekibin
            // verisini goremez; coklu ekip ayri bir tasarim isi.
            db.prepare('DELETE FROM org_members WHERE user_id = ?').run(user.id);
            db.prepare(
                'INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)'
            ).run(inv.org_id, user.id, inv.role || 'member', now);
            db.prepare('UPDATE org_invites SET accepted_at = ? WHERE token_hash = ?').run(now, inv.token_hash);
        })();

        const org = db.prepare('SELECT name FROM organizations WHERE id = ?').get(inv.org_id);
        res.json({ ok: true, orgName: org ? org.name : '' });
    } catch (err) {
        console.error('Davet kabul hatasi:', err);
        res.status(500).json({ message: 'Davet kabul edilemedi.' });
    }
});

// Bundan sonrasi ekip baglami gerektirir.
router.use(requireOrg);

// Ekip bilgisi + uyeler + bekleyen davetler
router.get('/', (req, res) => {
    const orgId = req.user.org_id;
    const org = db.prepare('SELECT id, name, owner_user_id, created_at, member_sees_profit FROM organizations WHERE id = ?').get(orgId);

    const members = db.prepare(`
        SELECT m.user_id, m.role, m.joined_at, u.email, u.display_name, u.email_verified
        FROM org_members m JOIN users u ON u.id = m.user_id
        WHERE m.org_id = ? ORDER BY m.joined_at
    `).all(orgId);

    const invites = db.prepare(`
        SELECT email, role, created_at, expires_at
        FROM org_invites
        WHERE org_id = ? AND accepted_at IS NULL AND expires_at > ?
        ORDER BY created_at DESC
    `).all(orgId, Date.now());

    res.json({ org, members, invites, me: { id: req.user.id, role: req.user.role } });
});

// Ekip ayarlari (yalnizca sahip).
// Su an tek ayar var: calisanlar maliyet/kar gorsun mu. Kapatildiginda sunucu
// maliyeti yanittan cikarir (bkz. routes/data.js maliyetGorebilir) — arayuzde
// gizlemek yeterli olmazdi.
router.put('/settings', requireOwner, (req, res) => {
    const { memberSeesProfit } = req.body || {};
    if (typeof memberSeesProfit !== 'boolean') {
        return res.status(400).json({ message: 'memberSeesProfit (true/false) gerekli.' });
    }
    try {
        db.prepare('UPDATE organizations SET member_sees_profit = ? WHERE id = ?')
          .run(memberSeesProfit ? 1 : 0, req.user.org_id);
        res.json({ ok: true, memberSeesProfit });
    } catch (err) {
        console.error('Ekip ayari hatasi:', err);
        res.status(500).json({ message: 'Ayar kaydedilemedi.' });
    }
});

// Davet gonder (yalnizca sahip)
router.post('/invite', inviteLimiter, requireOwner, async (req, res) => {
    const email = String((req.body || {}).email || '').toLowerCase().trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ message: 'Gecerli bir e-posta adresi girin.' });
    }
    if (email === String(req.user.email).toLowerCase()) {
        return res.status(400).json({ message: 'Kendinizi davet edemezsiniz.' });
    }

    const orgId = req.user.org_id;

    const zatenUye = db.prepare(`
        SELECT 1 FROM org_members m JOIN users u ON u.id = m.user_id
        WHERE m.org_id = ? AND LOWER(u.email) = ?
    `).get(orgId, email);
    if (zatenUye) return res.status(400).json({ message: 'Bu kisi zaten ekibinizde.' });

    try {
        // Ayni adrese onceki bekleyen davetleri gecersiz kil.
        db.prepare('DELETE FROM org_invites WHERE org_id = ? AND email = ? AND accepted_at IS NULL')
          .run(orgId, email);

        const token = crypto.randomBytes(32).toString('hex');
        const now = Date.now();
        db.prepare(`
            INSERT INTO org_invites (token_hash, org_id, email, role, invited_by, expires_at, created_at)
            VALUES (?, ?, ?, 'member', ?, ?, ?)
        `).run(hash(token), orgId, email, req.user.id, now + INVITE_TTL, now);

        const org = db.prepare('SELECT name FROM organizations WHERE id = ?').get(orgId);
        const link = publicOrigin(req) + '/?invite_token=' + token;

        if (mail.isMailConfigured()) {
            await mail.sendInviteEmail({
                to: email,
                link,
                orgName: (org && org.name) || 'ekip',
                inviterName: req.user.display_name || req.user.email
            });
        }

        // Mail kapaliysa bile davet olusturuldu; baglantiyi arayuze donuyoruz ki
        // sahip elle iletebilsin (yerel gelistirme ve mail arizasi durumu).
        res.json({ ok: true, email, link: mail.isMailConfigured() ? undefined : link });
    } catch (err) {
        console.error('Davet hatasi:', err);
        res.status(500).json({ message: 'Davet gonderilemedi.' });
    }
});

// Bekleyen daveti iptal et
router.delete('/invite', requireOwner, (req, res) => {
    const email = String((req.body || {}).email || '').toLowerCase().trim();
    const r = db.prepare('DELETE FROM org_invites WHERE org_id = ? AND email = ? AND accepted_at IS NULL')
                .run(req.user.org_id, email);
    res.json({ ok: true, removed: r.changes });
});

// Uyeyi cikar (yalnizca sahip)
router.delete('/members/:userId', requireOwner, (req, res) => {
    const hedef = Number(req.params.userId);
    if (hedef === req.user.id) {
        return res.status(400).json({ message: 'Kendinizi cikaramazsiniz. Ekibi silmek icin hesabinizi silin.' });
    }

    try {
        // Cikarilan kisi verisiz kalmasin: kendi organizasyonuna donsun.
        // Ekibin verisi ekipte kalir, o kisi bos bir hesapla devam eder.
        db.transaction(() => {
            db.prepare('DELETE FROM org_members WHERE org_id = ? AND user_id = ?').run(req.user.org_id, hedef);
            if (db.ensureOrgFor) db.ensureOrgFor(hedef);
        })();
        res.json({ ok: true });
    } catch (err) {
        console.error('Uye cikarma hatasi:', err);
        res.status(500).json({ message: 'Uye cikarilamadi.' });
    }
});

// Ekipten ayril (uye kendisi)
router.post('/leave', (req, res) => {
    if (req.user.role === 'owner') {
        return res.status(400).json({ message: 'Ekip sahibi ayrilamaz.' });
    }
    try {
        db.transaction(() => {
            db.prepare('DELETE FROM org_members WHERE org_id = ? AND user_id = ?')
              .run(req.user.org_id, req.user.id);
            if (db.ensureOrgFor) db.ensureOrgFor(req.user.id);
        })();
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: 'Ayrilinamadi.' });
    }
});

module.exports = router;
