const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Kullaniciya ait sirlarin sifrelenmesi
// ---------------------------------------------------------------------------
// Kullanicilar kendi e-posta hesaplarindan teklif gonderebilsin diye SMTP
// bilgilerini kaydediyoruz. Icinde SIFRE var; duz metin saklamak kabul edilemez:
// veritabani yedegi sizarsa (yedekler her gun aliniyor) o kisinin e-posta
// hesabinin sifresi de sizmis olur — ve insanlar sifreleri tekrar kullanir.
//
// AES-256-GCM: hem gizlilik hem butunluk. Her kayit kendi rastgele IV'siyle
// sifrelenir, yoksa ayni sifreyi kullanan iki kullanicinin kaydi ayni gorunur.
//
// Anahtar MAIL_SECRET_KEY'den, yoksa JWT_SECRET'ten turetilir. JWT_SECRET
// degisirse kayitli SMTP sifreleri COZULEMEZ; bu durumda kullanicidan yeniden
// girmesi istenir (cozulemeyen kayit sessizce yok sayilir, uygulama patlamaz).

const ANAHTAR = crypto.createHash('sha256')
    .update(String(process.env.MAIL_SECRET_KEY || process.env.JWT_SECRET || 'teklif-io-secret-key-12345'))
    .digest();

function sifrele(duzMetin) {
    if (duzMetin == null || duzMetin === '') return null;
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', ANAHTAR, iv);
    const govde = Buffer.concat([c.update(String(duzMetin), 'utf8'), c.final()]);
    const etiket = c.getAuthTag();
    // iv.govde.etiket — hepsi tek metinde, ayri sutun gerekmiyor.
    return [iv.toString('base64'), govde.toString('base64'), etiket.toString('base64')].join('.');
}

function coz(paket) {
    if (!paket) return null;
    try {
        const [iv, govde, etiket] = String(paket).split('.');
        if (!iv || !govde || !etiket) return null;
        // authTagLength acikca belirtiliyor: belirtilmedigi durum Node'da
        // kullanimdan kaldiriliyor ve ilerideki surumlerde hata verecek.
        const d = crypto.createDecipheriv('aes-256-gcm', ANAHTAR, Buffer.from(iv, 'base64'), { authTagLength: 16 });
        d.setAuthTag(Buffer.from(etiket, 'base64'));
        return Buffer.concat([d.update(Buffer.from(govde, 'base64')), d.final()]).toString('utf8');
    } catch (e) {
        // Anahtar degismis ya da kayit bozulmus. Hatayi yukari tasimiyoruz:
        // cagiran taraf null gorup "yapilandirilmamis" gibi davranir.
        return null;
    }
}

module.exports = { sifrele, coz };
