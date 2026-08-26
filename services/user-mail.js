const nodemailer = require('nodemailer');
const db = require('../db_scripts/init');
const { sifrele, coz } = require('./secret-box');

// ---------------------------------------------------------------------------
// Kullanicinin kendi e-posta hesabindan gonderim
// ---------------------------------------------------------------------------
// Varsayilan gonderimde zarfin adresi bizim dogrulanmis adresimiz. Musteri
// dogru ismi gorur ve "Yanitla" dogru kisiye gider, ama Gmail bunu
// "via <bizim alan adimiz>" diye gosterir — teklif baskasi adina gonderilmis
// gibi durur. Kullanici kendi SMTP bilgilerini girerse e-posta GERCEKTEN
// kendi adresinden gider.
//
// Neden kendi alan adimizdan "onun adresi gibi" gonderemiyoruz: SPF/DKIM.
// Baskasinin alan adi adina gonderilen e-posta dogrulamayi gecemez ve
// dogrudan spam'e duser. Tek dogru yol ya kullanicinin kendi sunucusu
// (burasi) ya da alan adi dogrulamasidir.

const BAGLANTI_ZAMAN_ASIMI = 12000;

function ayarlariOku(userId) {
    const u = db.prepare(`
        SELECT smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_enc, smtp_from,
               smtp_checked_at, email, display_name, company_name
        FROM users WHERE id = ?
    `).get(userId);
    return u || null;
}

// Arayuze donen guvenli ozet — SIFRE ASLA DONMEZ, yalnizca "tanimli mi".
function ayarOzeti(userId) {
    const u = ayarlariOku(userId);
    if (!u) return null;
    return {
        yapilandirildi: !!(u.smtp_host && u.smtp_user && u.smtp_pass_enc),
        host: u.smtp_host || '',
        port: u.smtp_port || 587,
        secure: u.smtp_secure === 1,
        user: u.smtp_user || '',
        from: u.smtp_from || '',
        sonKontrol: u.smtp_checked_at || null
    };
}

function tasiyiciKur({ host, port, secure, user, pass }) {
    return nodemailer.createTransport({
        host,
        port: Number(port) || 587,
        secure: !!secure,               // 465 -> SSL, 587 -> STARTTLS
        auth: { user, pass },
        connectionTimeout: BAGLANTI_ZAMAN_ASIMI,
        greetingTimeout: BAGLANTI_ZAMAN_ASIMI,
        socketTimeout: BAGLANTI_ZAMAN_ASIMI
    });
}

// Kullanicinin kendi hesabi yapilandirilmissa tasiyiciyi ve gonderen adresini
// dondurur; degilse null (cagiran taraf platform gonderimine duser).
function kullaniciTasiyicisi(userId) {
    const u = ayarlariOku(userId);
    if (!u || !u.smtp_host || !u.smtp_user || !u.smtp_pass_enc) return null;

    const pass = coz(u.smtp_pass_enc);
    if (!pass) {
        // Sifre cozulemedi (anahtar degismis olabilir). Sessizce platform
        // gonderimine dusuyoruz; kullaniciya ayarlar ekraninda bildiriliyor.
        console.warn('SMTP sifresi cozulemedi, kullanici:', userId);
        return null;
    }

    return {
        tasiyici: tasiyiciKur({
            host: u.smtp_host, port: u.smtp_port, secure: u.smtp_secure === 1,
            user: u.smtp_user, pass
        }),
        gonderenAdres: u.smtp_from || u.smtp_user,
        gonderenAd: u.company_name || u.display_name || ''
    };
}

// Baglanti ve kimlik dogrulamayi sinar. Kaydetmeden once cagriliyor ki
// kullanici yanlis bilgiyi kaydedip aylar sonra "teklifim gitmiyor" demesin.
async function baglantiSina({ host, port, secure, user, pass }) {
    const t = tasiyiciKur({ host, port, secure, user, pass });
    try {
        await t.verify();
        return { ok: true };
    } catch (e) {
        return { ok: false, hata: anlasilirHata(e) };
    } finally {
        try { t.close(); } catch (e) { /* kapatma hatasi onemsiz */ }
    }
}

// nodemailer hatalari teknik ve Ingilizce. En sik uc durumu kullanicinin
// yapabilecegi bir eyleme cevirmek, "Invalid login" yazmaktan cok daha faydali.
function anlasilirHata(e) {
    const m = String((e && e.message) || e);
    if (/Invalid login|535|authentication failed/i.test(m)) {
        return 'Kullanıcı adı veya şifre kabul edilmedi. Gmail kullanıyorsanız hesap şifreniz DEĞİL, ' +
               'Google\'dan aldığınız "uygulama şifresi" gerekir.';
    }
    if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(m)) {
        return 'Sunucu adresi bulunamadı. SMTP sunucusunu kontrol edin (örn. smtp.gmail.com).';
    }
    if (/ETIMEDOUT|ECONNREFUSED|timeout/i.test(m)) {
        return 'Sunucuya bağlanılamadı. Port numarasını kontrol edin (genelde 587, SSL için 465).';
    }
    if (/wrong version number|SSL|TLS/i.test(m)) {
        return 'Şifreleme ayarı uyuşmadı. 465 portu için SSL açık, 587 için kapalı olmalı.';
    }
    return m.slice(0, 200);
}

function ayarlariKaydet(userId, { host, port, secure, user, pass, from }) {
    db.prepare(`
        UPDATE users SET smtp_host = ?, smtp_port = ?, smtp_secure = ?, smtp_user = ?,
                         smtp_pass_enc = ?, smtp_from = ?, smtp_checked_at = ?
        WHERE id = ?
    `).run(host, Number(port) || 587, secure ? 1 : 0, user, sifrele(pass), from || user, Date.now(), userId);
}

function ayarlariSil(userId) {
    db.prepare(`
        UPDATE users SET smtp_host = NULL, smtp_port = NULL, smtp_secure = NULL,
                         smtp_user = NULL, smtp_pass_enc = NULL, smtp_from = NULL,
                         smtp_checked_at = NULL
        WHERE id = ?
    `).run(userId);
}

module.exports = {
    ayarOzeti, kullaniciTasiyicisi, baglantiSina, ayarlariKaydet, ayarlariSil, anlasilirHata
};
