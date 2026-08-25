const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db_scripts/init');
const session = require('../services/session');
const tokens = require('../services/tokens');
const { rateLimiter } = require('../services/rate-limit');
const mail = require('../services/mail');

// Kimlik uclari icin hiz sinirlari.
// Giris ucu sifre deneme saldirisinin birincil hedefi; kayit ve sifirlama ise
// hem spam hem de bizim e-posta kotamizi tuketme yolu.
const loginLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, max: 10,
    message: 'Cok fazla giris denemesi yapildi. Lutfen 15 dakika sonra tekrar deneyin.'
});
const registerLimiter = rateLimiter({
    windowMs: 60 * 60 * 1000, max: 5,
    message: 'Bu baglantidan cok fazla hesap olusturuldu. Lutfen bir saat sonra tekrar deneyin.'
});
const mailLimiter = rateLimiter({
    windowMs: 60 * 60 * 1000, max: 5,
    message: 'Cok fazla e-posta talebi. Lutfen bir saat sonra tekrar deneyin.'
});

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

function publicOrigin(req) {
    return process.env.APP_ORIGIN || `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}`;
}

function googleConfigured() {
    return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

// ---------------------------------------------------------------------------
// Yeni hesabin baslangic verisi
// ---------------------------------------------------------------------------
// Frontend'in tum verisi localStorage'daki `teklif_*` anahtarlarinda duruyor ve
// bunlar sunucuda tek bir JSON blogu olarak saklaniyor. Yeni kullaniciya bu
// blogu SUNUCUDA hazirlayip veriyoruz; boylece tarayicidaki data.js varsayilani
// (bizim kendi firmamizin hizmetleri, referanslari, adresi, logosu) hicbir zaman
// baskasinin hesabina sizmiyor.
function loadPack(industryId) {
    const packsPath = path.join(__dirname, '..', 'services', 'service-packs.json');
    try {
        if (!fs.existsSync(packsPath)) return null;
        let raw = fs.readFileSync(packsPath, 'utf8');
        if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);   // BOM
        const packs = JSON.parse(raw);
        return packs.packs.find(p => p.id === industryId) || null;
    } catch (err) {
        console.error('Sektor paketi okunamadi:', err.message);
        return null;
    }
}

function listPacks() {
    const packsPath = path.join(__dirname, '..', 'services', 'service-packs.json');
    try {
        let raw = fs.readFileSync(packsPath, 'utf8');
        if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
        return JSON.parse(raw).packs.map(p => ({
            id: p.id,
            name: p.name,
            icon: p.icon,
            description: p.description,
            serviceCount: (p.services || []).length
        }));
    } catch (err) {
        return [];
    }
}

function seedSnapshot({ companyName, email, industryId }) {
    const pack = industryId ? loadPack(industryId) : null;

    const services = (pack ? pack.services : []).map((s, i) => ({
        id: 'j' + (i + 1),
        name: s.name,
        description: s.description || '',
        unit: s.unit || 'Adet',
        price: s.price || 0,
        // Paketteki yollar "/images/..." seklinde; frontend goreli yol bekliyor.
        image: (s.image_url || '').replace(/^\//, ''),
        conditions: s.conditions || '',
        taxRate: 20
    }));

    const snapshot = {
        teklif_company: JSON.stringify({
            name: companyName || '',
            address: '',
            phone: '',
            email: email || '',
            logo: null,
            logo_text: companyName || ''
        }),
        teklif_services: JSON.stringify(services),
        teklif_products: JSON.stringify([]),
        teklif_refs: JSON.stringify([]),
        teklif_saved: JSON.stringify([]),
        teklif_customers: JSON.stringify([]),
        teklif_kanban: JSON.stringify([
            { id: 'list-open', title: 'Open', cards: [] },
            { id: 'list-received', title: 'Received', cards: [] },
            { id: 'list-declined', title: 'Declined', cards: [] },
            { id: 'list-accepted', title: 'Accepted', cards: [] }
        ]),
        teklif_price_history: JSON.stringify({}),
        teklif_usage: JSON.stringify({})
    };

    return { snapshot, serviceCount: services.length };
}

function createInitialSync(userId, opts) {
    const { snapshot, serviceCount } = seedSnapshot(opts);
    db.prepare('INSERT OR REPLACE INTO user_sync (user_id, data, updated_at) VALUES (?, ?, ?)')
        .run(userId, JSON.stringify(snapshot), Date.now());
    return serviceCount;
}

// Dogrulama baglantisini gonderir. Gonderim basarisiz olursa kayit AKMAZ:
// kullanici zaten girebiliyor, yalnizca dogrulanmamis kaliyor ve tekrar
// isteyebiliyor. Kaydi mail hatasi yuzunden bozmak daha kotu olurdu.
async function sendVerification(user, req) {
    try {
        if (!mail.isMailConfigured()) return;
        const token = tokens.issue(user.id, 'verify');
        await mail.sendVerificationEmail({
            to: user.email,
            link: publicOrigin(req) + '/?verify_token=' + token
        });
    } catch (err) {
        console.error('Dogrulama e-postasi gonderilemedi:', err.message);
    }
}

// Yeni hesabin kurulumu.
//
// Sira onemli: once ORGANIZASYON acilir, sonra baslangic verisi user_sync'e
// yazilir, sonra org tablolarina tasinir. Veri artik org bazli okunuyor
// (routes/data.js); yalnizca blogu doldurup birakmak, kullanicinin bombos bir
// ekranla karsilasmasi demekti.
//
// Blok kasitli olarak siliNMIyor: gecis kodunun kaynagi ve olasi bir sorunda
// geri donus noktasi.
function initialiseAccount(userId, opts) {
    const orgId = db.ensureOrgFor ? db.ensureOrgFor(userId) : null;

    let devralindi = false;
    if (db.claimLegacySync && db.claimLegacySync(userId)) {
        console.log(`Kullanici ${userId} eski tek-kullanicili veriyi devraldi.`);
        devralindi = true;
    } else {
        createInitialSync(userId, opts);
    }

    if (orgId && db.migrateBlobToOrg) db.migrateBlobToOrg(userId, orgId);
    return devralindi ? -1 : 0;
}

// ---------------------------------------------------------------------------
// Uclar
// ---------------------------------------------------------------------------

// Kayit ekraninin sektor listesini doldurmasi icin.
router.get('/sectors', (req, res) => {
    res.json({ sectors: listPacks() });
});

router.get('/config', (req, res) => {
    res.json({ google: googleConfigured() });
});

router.get('/me', (req, res) => {
    const user = session.currentUser(req);
    if (!user) return res.status(401).json({ message: 'Giris yapilmamis.' });
    res.json({ user });
});

// Dogrulama e-postasini yeniden gonder.
router.post('/resend-verification', mailLimiter, async (req, res) => {
    const user = session.currentUser(req);
    if (!user) return res.status(401).json({ message: 'Giris gerekli.' });
    if (user.email_verified) return res.json({ ok: true, alreadyVerified: true });
    await sendVerification(user, req);
    res.json({ ok: true });
});

// E-posta dogrulama baglantisinin ucu.
router.post('/verify', (req, res) => {
    const userId = tokens.consume((req.body || {}).token, 'verify');
    if (!userId) {
        return res.status(400).json({ message: 'Dogrulama baglantisi gecersiz veya suresi dolmus.' });
    }
    db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(userId);
    res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Sifre sifirlama
// ---------------------------------------------------------------------------

// Yanit HER ZAMAN ayni: adresin kayitli olup olmadigini sizdirmamak icin.
router.post('/forgot', mailLimiter, async (req, res) => {
    const email = String((req.body || {}).email || '').toLowerCase().trim();
    const generic = { ok: true, message: 'Adres kayitliysa sifirlama baglantisi gonderildi.' };

    if (!email) return res.json(generic);

    try {
        const user = db.prepare('SELECT id, email, password FROM users WHERE email = ?').get(email);
        if (user && mail.isMailConfigured()) {
            if (!user.password) {
                // Google hesabi: sifresi yok, sifirlanacak bir sey de yok.
                console.log('Sifre sifirlama Google hesabi icin istendi, atlandi:', email);
            } else {
                const token = tokens.issue(user.id, 'reset');
                await mail.sendPasswordResetEmail({
                    to: user.email,
                    link: publicOrigin(req) + '/?reset_token=' + token
                });
            }
        }
    } catch (err) {
        console.error('Sifre sifirlama hatasi:', err.message);
    }

    res.json(generic);
});

router.post('/reset', async (req, res) => {
    const { token, password } = req.body || {};
    if (!password || String(password).length < 8) {
        return res.status(400).json({ message: 'Sifre en az 8 karakter olmali.' });
    }

    const userId = tokens.consume(token, 'reset');
    if (!userId) {
        return res.status(400).json({ message: 'Sifirlama baglantisi gecersiz veya suresi dolmus.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, userId);

    // Sifre degistiginde oturum acmak dogru davranis: kullanici zaten
    // e-posta kutusuna erisimini kanitladi.
    session.issue(res, userId, req);
    const user = db.prepare('SELECT id, email, company_name FROM users WHERE id = ?').get(userId);
    res.json({ ok: true, user });
});

// ---------------------------------------------------------------------------
// Hesap silme (KVKK: silme hakki)
// ---------------------------------------------------------------------------
router.delete('/account', (req, res) => {
    const user = session.currentUser(req);
    if (!user) return res.status(401).json({ message: 'Giris gerekli.' });

    // Onay olarak kendi e-postasini yazmasini istiyoruz; yanlislikla silinmesi
    // geri donusu olmayan bir islem.
    const typed = String((req.body || {}).confirmEmail || '').toLowerCase().trim();
    if (typed !== String(user.email).toLowerCase()) {
        return res.status(400).json({ message: 'Onay icin e-posta adresinizi dogru yazin.' });
    }

    try {
        db.transaction(() => {
            db.prepare('DELETE FROM user_sync WHERE user_id = ?').run(user.id);
            db.prepare('DELETE FROM usage_counters WHERE user_id = ?').run(user.id);
            db.prepare('DELETE FROM auth_tokens WHERE user_id = ?').run(user.id);
            db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
        })();

        // Uretilen gorseller de gitmeli; aksi halde silinen hesabin dosyalari
        // diskte kalirdi ve bu KVKK acisindan "silinmis" sayilmaz.
        const dir = path.join(__dirname, '..', 'public', 'uploads', 'ai', String(user.id));
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });

        session.clear(res);
        res.json({ ok: true });
    } catch (err) {
        console.error('Hesap silme hatasi:', err);
        res.status(500).json({ message: 'Hesap silinemedi.' });
    }
});

router.post('/logout', (req, res) => {
    session.clear(res);
    res.json({ ok: true });
});

router.post('/register', registerLimiter, async (req, res) => {
    const { email, password, companyName, industryId, kvkkAccepted } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({ message: 'E-posta ve sifre gerekli.' });
    }
    if (String(password).length < 8) {
        return res.status(400).json({ message: 'Sifre en az 8 karakter olmali.' });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) {
        return res.status(400).json({ message: 'Gecerli bir e-posta adresi girin.' });
    }
    // KVKK acik rizasi olmadan kayit alinmiyor: kullanici kendi musterilerinin
    // kisisel verisini bu sisteme girecek, bu onay yasal olarak zorunlu.
    if (!kvkkAccepted) {
        return res.status(400).json({ message: 'Devam etmek icin aydinlatma metnini onaylamaniz gerekiyor.' });
    }

    try {
        const hashed = await bcrypt.hash(password, 10);
        const info = db.prepare(
            'INSERT INTO users (email, password, company_name, industry_id, kvkk_accepted_at) VALUES (?, ?, ?, ?, ?)'
        ).run(String(email).toLowerCase().trim(), hashed, companyName || null, industryId || null, Date.now());

        const userId = info.lastInsertRowid;
        initialiseAccount(userId, { companyName, email, industryId });

        session.issue(res, userId, req);
        res.status(201).json({ user: { id: userId, email, company_name: companyName, email_verified: 0 } });

        // Yanit gonderildikten sonra: mail servisi yavassa kayit beklemesin.
        sendVerification({ id: userId, email: String(email).toLowerCase().trim() }, req);
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ message: 'Bu e-posta zaten kayitli.' });
        }
        console.error('Kayit hatasi:', error);
        res.status(500).json({ message: 'Kayit basarisiz.' });
    }
});

router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ message: 'E-posta ve sifre gerekli.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?')
        .get(String(email).toLowerCase().trim());

    // Ayni mesaj: hangi e-postalarin kayitli oldugunu disari sizdirmamak icin.
    const fail = () => res.status(401).json({ message: 'E-posta veya sifre hatali.' });

    if (!user) return fail();
    if (!user.password) {
        return res.status(400).json({
            message: 'Bu hesap Google ile olusturulmus. Lutfen "Google ile devam et" ile girin.'
        });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return fail();

    // Eski tek-kullanicili veri hala sahipsizse ilk giren devralir.
    if (!db.prepare('SELECT 1 FROM user_sync WHERE user_id = ?').get(user.id)) {
        initialiseAccount(user.id, {
            companyName: user.company_name,
            email: user.email,
            industryId: user.industry_id
        });
    }

    session.issue(res, user.id, req);
    res.json({ user: { id: user.id, email: user.email, company_name: user.company_name, email_verified: user.email_verified } });
});

// ---------------------------------------------------------------------------
// Google ile giris (OAuth 2.0 authorization code)
// ---------------------------------------------------------------------------
// Kutuphane yerine dogrudan Google'in ucları kullaniliyor; akis kisa ve tek
// yonlu oldugu icin passport gibi bir bagimlilik eklemeye deger degil.

const googleStates = new Map();  // state -> olusturulma zamani (CSRF korumasi)

function rememberState(state) {
    const now = Date.now();
    for (const [k, t] of googleStates) if (now - t > 10 * 60 * 1000) googleStates.delete(k);
    googleStates.set(state, now);
}

router.get('/google', (req, res) => {
    if (!googleConfigured()) {
        return res.status(503).send('Google ile giris yapilandirilmamis.');
    }
    const state = crypto.randomBytes(16).toString('hex');
    rememberState(state);

    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: publicOrigin(req) + '/api/auth/google/callback',
        response_type: 'code',
        scope: 'openid email profile',
        state,
        prompt: 'select_account'
    });
    res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params);
});

router.get('/google/callback', async (req, res) => {
    const { code, state } = req.query;

    if (!googleConfigured()) return res.status(503).send('Google ile giris yapilandirilmamis.');
    if (!code || !state || !googleStates.has(state)) {
        return res.redirect('/?auth_error=' + encodeURIComponent('Google girisi dogrulanamadi.'));
    }
    googleStates.delete(state);

    try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: publicOrigin(req) + '/api/auth/google/callback',
                grant_type: 'authorization_code'
            })
        });
        const tokens = await tokenRes.json();
        if (!tokens.access_token) throw new Error(tokens.error_description || 'token alinamadi');

        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: 'Bearer ' + tokens.access_token }
        });
        const profile = await infoRes.json();
        if (!profile.email) throw new Error('Google profilinde e-posta yok');
        if (profile.email_verified === false) throw new Error('Google e-postasi dogrulanmamis');

        const email = String(profile.email).toLowerCase();
        let user = db.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?')
            .get(profile.sub, email);

        if (user) {
            // Ayni e-posta sifreyle acilmissa Google hesabini ona bagla.
            if (!user.google_id) {
                db.prepare('UPDATE users SET google_id = ?, display_name = COALESCE(display_name, ?) WHERE id = ?')
                    .run(profile.sub, profile.name || null, user.id);
            }
            if (!db.prepare('SELECT 1 FROM user_sync WHERE user_id = ?').get(user.id)) {
                initialiseAccount(user.id, {
                    companyName: user.company_name, email: user.email, industryId: user.industry_id
                });
            }
        } else {
            const info = db.prepare(
                'INSERT INTO users (email, google_id, display_name, company_name) VALUES (?, ?, ?, ?)'
            ).run(email, profile.sub, profile.name || null, profile.name || null);
            user = { id: info.lastInsertRowid };
            // Sektor secilmedi: hizmet listesi bos baslar, kullanici Hizmetler
            // sekmesindeki "Sektorel Paket" ekranindan secebilir.
            initialiseAccount(user.id, { companyName: profile.name, email, industryId: null });
        }

        session.issue(res, user.id, req);
        res.redirect('/');
    } catch (err) {
        console.error('Google giris hatasi:', err.message);
        res.redirect('/?auth_error=' + encodeURIComponent('Google ile giris basarisiz.'));
    }
});

module.exports = router;
