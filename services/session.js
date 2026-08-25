// Oturum yonetimi.
//
// Token neden HttpOnly cerezde tutuluyor: frontend'in tamami (senkron, PDF, AI)
// duz `fetch('/api/...')` cagriyor, hicbirinde Authorization basligi yok. Cerez
// kullaninca o cagrilarin hicbirine dokunmadan kimlik dogrulanmis oluyor. Ayrica
// localStorage'daki bir token XSS ile okunabilirdi; HttpOnly cerez okunamaz.
const jwt = require('jsonwebtoken');
const db = require('../db_scripts/init');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required. Set it in your .env file.');
}

const COOKIE = 'session';
const MAX_AGE_DAYS = 30;

function getCookie(header, name) {
    if (!header) return null;
    const part = header.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
    return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
}

function issue(res, userId, req) {
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: MAX_AGE_DAYS + 'd' });
    // Secure yalnizca https'te; yerelde http ile calisirken cerez dusmemeli.
    const isHttps = req && (req.secure || req.get('x-forwarded-proto') === 'https');
    const parts = [
        `${COOKIE}=${token}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        `Max-Age=${MAX_AGE_DAYS * 24 * 60 * 60}`
    ];
    if (isHttps) parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));
    return token;
}

function clear(res) {
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

// Cerezden kullaniciyi cozer. Bulamazsa null doner (hata firlatmaz).
function currentUser(req) {
    const token = getCookie(req.headers.cookie, COOKIE);
    if (!token) return null;
    try {
        const { userId } = jwt.verify(token, JWT_SECRET);
        // Kullaniciyla birlikte organizasyonunu da getiriyoruz: artik tum veri
        // org bazli, her istekte "bu kisi hangi ekipte" sorusunun cevabi lazim.
        const user = db.prepare(
            'SELECT id, email, display_name, company_name, industry_id, email_verified FROM users WHERE id = ?'
        ).get(userId);
        if (!user) return null;

        const uyelik = db.prepare(
            'SELECT org_id, role FROM org_members WHERE user_id = ?'
        ).get(user.id);

        if (uyelik) {
            user.org_id = uyelik.org_id;
            user.role = uyelik.role;
        } else if (db.ensureOrgFor) {
            // Eski hesaplar (gecis oncesi olusmus) icin guvenlik agi.
            user.org_id = db.ensureOrgFor(user.id);
            user.role = 'owner';
        }

        return user;
    } catch (e) {
        return null;
    }
}

// Korumali uclar icin middleware.
function requireAuth(req, res, next) {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ message: 'Giris gerekli.' });
    req.user = user;
    next();
}

// Organizasyon baglami zorunlu olan uclar icin.
function requireOrg(req, res, next) {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ message: 'Giris gerekli.' });
    if (!user.org_id) return res.status(500).json({ message: 'Organizasyon bulunamadi.' });
    req.user = user;
    next();
}

// Yalnizca sahibin yapabilecegi islemler (uye cikarma, ekip silme).
function requireOwner(req, res, next) {
    if (req.user.role !== 'owner') {
        return res.status(403).json({ message: 'Bu islem icin ekip sahibi olmaniz gerekiyor.' });
    }
    next();
}

module.exports = { COOKIE, issue, clear, currentUser, requireAuth, requireOrg, requireOwner, getCookie };
