// Sifre sifirlama ve e-posta dogrulama jetonlari.
//
// Jetonun kendisi hicbir yerde saklanmaz; yalnizca SHA-256 ozeti veritabaninda
// durur. Veritabani sizsa bile eldeki ozetlerden calisan bir jeton uretilemez.
// Jeton kullaniciya yalnizca e-posta ile bir kez gider.
const crypto = require('crypto');
const db = require('../db_scripts/init');

const TTL = {
    reset: 60 * 60 * 1000,          // 1 saat
    verify: 7 * 24 * 60 * 60 * 1000 // 7 gun
};

function hash(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// Yeni jeton uretir ve ayni turdeki onceki jetonlari gecersiz kilar.
// Gecersiz kilma onemli: kullanici ust uste "sifremi unuttum" derse eski
// baglantilarin hepsinin acik kalmasi gereksiz bir saldiri yuzeyi olurdu.
function issue(userId, kind) {
    db.prepare('DELETE FROM auth_tokens WHERE user_id = ? AND kind = ?').run(userId, kind);

    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    db.prepare(
        'INSERT INTO auth_tokens (token_hash, user_id, kind, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(hash(token), userId, kind, now + (TTL[kind] || TTL.reset), now);

    return token;
}

// Jetonu dogrular ve TEK KULLANIMLIK olarak tuketir.
// Basarisizlik sebebini disari ayirt ettirmiyoruz; cagiran taraf tek bir
// "gecersiz veya suresi dolmus" mesaji gosterir.
function consume(token, kind) {
    if (!token || typeof token !== 'string') return null;

    const row = db.prepare(
        'SELECT * FROM auth_tokens WHERE token_hash = ? AND kind = ?'
    ).get(hash(token), kind);

    if (!row) return null;
    if (row.used_at) return null;
    if (row.expires_at < Date.now()) return null;

    db.prepare('DELETE FROM auth_tokens WHERE token_hash = ?').run(row.token_hash);
    return row.user_id;
}

module.exports = { issue, consume };
