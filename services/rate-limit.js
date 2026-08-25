// Basit, bellek ici IP hiz sinirlayici.
//
// Ayni mantik server.js ve routes/pdf.js icinde iki kez kopyalanmisti; tek yere
// alindi. Bellek ici olmasi tek sunucuda calistigimiz icin yeterli — birden
// fazla ornege cikilirsa Redis gibi ortak bir sayaca tasinmasi gerekir.
//
// Not: Bu IP bazli sinir, kullanici bazli kotanin (services/quota.js) yerini
// TUTMAZ. Bu, henuz kim oldugunu bilmedigimiz isteklere karsi (giris denemesi,
// sifre sifirlama) kaba bir kalkandir; kota ise maliyet kontroludur.

function keyOf(req) {
    // Coolify/Traefik arkasindayiz; gercek istemci IP'si bu baslikta gelir.
    const fwd = req.headers['x-forwarded-for'];
    if (fwd) return String(fwd).split(',')[0].trim();
    return req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
}

function rateLimiter({ windowMs, max, message, keyBy }) {
    const hits = new Map();

    return (req, res, next) => {
        const now = Date.now();

        // Sizinti olmamasi icin ara ara eski kayitlari at.
        if (hits.size > 5000) {
            for (const [k, arr] of hits) {
                const kept = arr.filter(t => now - t < windowMs);
                if (kept.length) hits.set(k, kept); else hits.delete(k);
            }
        }

        const key = keyBy ? keyBy(req) : keyOf(req);
        const recent = (hits.get(key) || []).filter(t => now - t < windowMs);

        if (recent.length >= max) {
            const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({
                message: message || 'Cok fazla istek. Lutfen biraz sonra tekrar deneyin.',
                retryAfter
            });
        }

        recent.push(now);
        hits.set(key, recent);
        next();
    };
}

module.exports = { rateLimiter, keyOf };
