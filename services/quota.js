// Kullanici basina gunluk limitler.
//
// AI gorseli her cagrida Gemini'ye, teklif maili her gonderimde Resend'e para
// yaziyor ve ikisi de bizim anahtarlarimiz. Urun ucretsiz oldugu surece tek
// koruma bu sayaclar: IP bazli limit yetmez, cunku bir kullanici birden fazla
// IP'den girebilir ve ayni IP'yi birden fazla kullanici paylasabilir.
const db = require('../db_scripts/init');

const LIMITS = {
    ai_image: Number(process.env.LIMIT_AI_IMAGE_PER_DAY) || 15,
    ai_text: Number(process.env.LIMIT_AI_TEXT_PER_DAY) || 50,
    email: Number(process.env.LIMIT_EMAIL_PER_DAY) || 30,
    pdf: Number(process.env.LIMIT_PDF_PER_DAY) || 100
};

const LABELS = {
    ai_image: 'yapay zeka gorseli',
    ai_text: 'yapay zeka metni',
    email: 'e-posta gonderimi',
    pdf: 'PDF olusturma'
};

function today() {
    return new Date().toISOString().slice(0, 10);
}

function used(userId, kind) {
    const row = db.prepare(
        'SELECT count FROM usage_counters WHERE user_id = ? AND day = ? AND kind = ?'
    ).get(userId, today(), kind);
    return row ? row.count : 0;
}

function consume(userId, kind) {
    db.prepare(`
        INSERT INTO usage_counters (user_id, day, kind, count) VALUES (?, ?, ?, 1)
        ON CONFLICT(user_id, day, kind) DO UPDATE SET count = count + 1
    `).run(userId, today(), kind);
}

function remaining(userId) {
    const out = {};
    for (const kind of Object.keys(LIMITS)) {
        out[kind] = { limit: LIMITS[kind], used: used(userId, kind) };
    }
    return out;
}

// Limiti asanlari 429 ile geri cevirir; asmayanlarin sayacini artirir.
// Sayaci istek BASINDA artiriyoruz: sonunda artirmak, hata veren pahali
// cagrilarin (uretilmis ama kaydedilememis gorsel gibi) bedava sayilmasina
// ve limitin etrafindan dolasilmasina yol aciyor.
function enforce(kind) {
    return (req, res, next) => {
        const userId = req.user && req.user.id;
        if (!userId) return res.status(401).json({ message: 'Giris gerekli.' });

        // Kullanici e-postayi KENDI hesabindan gonderiyorsa gunluk mail kotamiz
        // uygulanmaz: o gonderim bizim kaynagimizi harcamiyor, kendi e-posta
        // saglayicisinin limitlerine tabi. Kotayi yine de isletmek, kullaniciyi
        // sebepsiz kisitlamak olurdu.
        if (kind === 'email') {
            try {
                const ozet = require('./user-mail').ayarOzeti(userId);
                if (ozet && ozet.yapilandirildi) return next();
            } catch (e) { /* ayar okunamadi: normal kota isler */ }
        }

        const limit = LIMITS[kind];
        if (used(userId, kind) >= limit) {
            return res.status(429).json({
                message: `Gunluk ${LABELS[kind]} limitiniz doldu (${limit}/gun). Yarin tekrar deneyebilirsiniz.`,
                kind,
                limit
            });
        }
        consume(userId, kind);
        next();
    };
}

module.exports = { LIMITS, enforce, remaining, consume, used };
