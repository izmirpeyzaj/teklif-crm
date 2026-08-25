const crypto = require('crypto');
const db = require('../db_scripts/init');
const mail = require('./mail');

// ---------------------------------------------------------------------------
// Otomatik hatirlatma
// ---------------------------------------------------------------------------
// Gonderilen teklife cevap gelmeyince elle hatirlatma yazmak unutuluyor ve
// teklif sessizce oluyor. Bu servis gunde bir kez bakip, kosullari saglayan
// tekliflere tek bir hatirlatma gonderiyor.
//
// Bilerek dar tutuldu; musteriye izinsiz e-posta gitmesi en kotu sonuc:
//
//   * Organizasyon ayari ACIK olmali (varsayilan kapali).
//   * Teklif GERCEKTEN gonderilmis olmali (proposal_sends kaydi var).
//   * Uzerinden reminder_days gun gecmis olmali.
//   * Teklif hâlâ cevapsiz olmali (kabul/ret degil).
//   * Daha once hatirlatma GONDERILMEMIS olmali — tek hatirlatma, israr yok.
//   * Gonderen kisinin e-postasi dogrulanmis olmali.
//
// Kayit yine proposal_sends'e dusuyor (status='reminder'), boylece "kim ne
// zaman ne gonderdi" tek yerde toplaniyor ve tekrar gonderimi de bu engelliyor.

const GUN = 24 * 60 * 60 * 1000;
const ARALIK = 6 * 60 * 60 * 1000;   // gunde 4 kez bak; sunucu yeniden baslasa da kacirma

function bekleyenleriBul(simdi) {
    // Her teklifin ILK gonderimini aliyoruz: hatirlatma zamani ilk temastan
    // sayilmali, tekrar gonderim sureyi sifirlamamali.
    return db.prepare(`
        SELECT g.org_id, g.proposal_code, g.to_email, g.sent_by,
               MIN(g.sent_at) AS ilk_gonderim,
               o.reminder_days, o.name AS org_adi,
               p.customer_name, p.project_name, p.total, p.status,
               u.email AS gonderen_eposta, u.display_name AS gonderen_ad,
               u.company_name AS firma, u.email_verified
        FROM proposal_sends g
        JOIN organizations o ON o.id = g.org_id
        LEFT JOIN proposals p ON p.org_id = g.org_id AND p.code = g.proposal_code
        LEFT JOIN users u ON u.id = g.sent_by
        WHERE o.reminder_enabled = 1
          AND g.status = 'sent'
        GROUP BY g.org_id, g.proposal_code
    `).all().filter(r => {
        if (!r.to_email || !r.email_verified) return false;
        if (!r.status || r.status === 'Kabul' || r.status === 'Red') return false;
        if (simdi - r.ilk_gonderim < (r.reminder_days || 3) * GUN) return false;

        // Musteri baglantiyi acip karar verdiyse hatirlatma anlamsiz.
        const karar = db.prepare(`SELECT 1 FROM proposal_links
                                  WHERE org_id = ? AND proposal_code = ? AND decided_at IS NOT NULL`)
                        .get(r.org_id, r.proposal_code);
        if (karar) return false;

        const zaten = db.prepare(`SELECT 1 FROM proposal_sends
                                  WHERE org_id = ? AND proposal_code = ? AND status = 'reminder'`)
                        .get(r.org_id, r.proposal_code);
        return !zaten;
    });
}

// Hatirlatmanin ise yaramasi icin CALISAN bir onay baglantisi tasimasi lazim.
// Ama eski baglantinin jetonu geri getirilemez — veritabaninda yalnizca SHA-256
// ozeti duruyor (kasitli). Cozum: onceki baglanti kaydindaki HTML'i kullanip
// yeni bir jeton uretmek ve eskisini iptal etmek. Teklif hic baglantiyla
// paylasilmamissa (sadece PDF olarak gonderilmisse) baglanti uretmiyoruz;
// e-posta butonsuz gidiyor.
function yeniBaglantiUret(orgId, kod) {
    const onceki = db.prepare(`
        SELECT html, proposal_id, customer_name, project_name, total, created_by
        FROM proposal_links
        WHERE org_id = ? AND proposal_code = ?
        ORDER BY created_at DESC LIMIT 1
    `).get(orgId, kod);
    if (!onceki || !onceki.html) return null;

    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    try {
        db.transaction(() => {
            db.prepare(`UPDATE proposal_links SET revoked_at = ?
                        WHERE org_id = ? AND proposal_code = ? AND revoked_at IS NULL AND decided_at IS NULL`)
              .run(now, orgId, kod);
            db.prepare(`INSERT INTO proposal_links
                (token_hash, org_id, proposal_code, proposal_id, customer_name, project_name,
                 total, html, created_by, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .run(crypto.createHash('sha256').update(token).digest('hex'), orgId, kod,
                   onceki.proposal_id, onceki.customer_name, onceki.project_name,
                   onceki.total, onceki.html, onceki.created_by, now, now + 30 * GUN);
        })();
    } catch (e) {
        console.error('Hatirlatma icin baglanti uretilemedi:', e.message);
        return null;
    }

    // APP_ORIGIN burada ZORUNLU: bu is arka planda calisiyor, ortada bir HTTP
    // istegi yok, yani adresi istegin host basligindan turetemeyiz. Tanimli
    // degilse baglantiyi hic uretmiyoruz — yarim bir adresle e-posta gondermek,
    // musterinin tikladiginda hicbir yere gitmemesi demek olurdu.
    const kok = process.env.APP_ORIGIN;
    if (!kok) {
        console.warn('APP_ORIGIN tanimli degil: hatirlatma e-postasi onay baglantisi olmadan gidecek.');
        return null;
    }
    return kok.replace(/\/$/, '') + '/t/' + token;
}

async function turAt() {
    if (!mail.isMailConfigured()) return { gonderilen: 0, atlanan: 'mail kapali' };

    const simdi = Date.now();
    let gonderilen = 0;

    for (const r of bekleyenleriBul(simdi)) {
        try {
            await mail.sendReminderEmail(
                r.to_email,
                r.customer_name || '',
                r.project_name || '',
                r.total || 0,
                {
                    senderName: r.firma || r.gonderen_ad || r.org_adi,
                    replyTo: r.gonderen_eposta,
                    approvalLink: yeniBaglantiUret(r.org_id, r.proposal_code)
                }
            );
            db.prepare(`INSERT INTO proposal_sends (org_id, proposal_code, to_email, sent_by, sent_at, status)
                        VALUES (?, ?, ?, ?, ?, 'reminder')`)
              .run(r.org_id, r.proposal_code, r.to_email, r.sent_by, Date.now());
            gonderilen++;
        } catch (e) {
            // Basarisizligi da yaziyoruz ki her turda ayni adrese yeniden
            // denenmesin; kalici bir hata sonsuz dongu olmasin.
            console.error('Hatirlatma gonderilemedi:', r.proposal_code, e.message);
            db.prepare(`INSERT INTO proposal_sends (org_id, proposal_code, to_email, sent_by, sent_at, status, error)
                        VALUES (?, ?, ?, ?, ?, 'reminder', ?)`)
              .run(r.org_id, r.proposal_code, r.to_email, r.sent_by, Date.now(), String(e.message).slice(0, 500));
        }
    }

    if (gonderilen) console.log(`Otomatik hatirlatma: ${gonderilen} e-posta gonderildi.`);
    return { gonderilen };
}

function basla() {
    // Ilk tur biraz gecikmeli: sunucu acilir acilmaz e-posta kuyruguna
    // yuklenmesin, saglik kontrolu once gecsin.
    setTimeout(() => { turAt().catch(e => console.error('Hatirlatma turu hatasi:', e)); }, 60 * 1000);
    setInterval(() => { turAt().catch(e => console.error('Hatirlatma turu hatasi:', e)); }, ARALIK);
    console.log('Otomatik hatirlatma servisi calisiyor.');
}

module.exports = { basla, turAt, bekleyenleriBul };
