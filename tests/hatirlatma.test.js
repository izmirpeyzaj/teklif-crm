// Hatirlatma secim mantigi testi.
//
// E-posta GONDERMIYORUZ (MAIL_DISABLED); yalnizca "kim hatirlatma alacak"
// kararini sinaniyoruz. Yanlis pozitif burada musteriye izinsiz e-posta
// demek, o yuzden her filtre ayri ayri dogrulaniyor.

process.env.MAIL_DISABLED = 'true';
const db = require('../db_scripts/init');
const { bekleyenleriBul } = require('../services/reminder');

const GUN = 24 * 3600 * 1000;
const simdi = Date.now();

const org = db.prepare('SELECT id FROM organizations LIMIT 1').get();
const kullanici = db.prepare('SELECT id FROM users LIMIT 1').get();

// Gonderen e-postasi dogrulanmis olmali (gercek kural: dogrulanmamis hesap
// musteriye e-posta gonderemez). Test suresince acip sonunda geri aliyoruz.
const oncekiDogrulama = db.prepare('SELECT email_verified FROM users WHERE id = ?').get(kullanici.id).email_verified;
db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(kullanici.id);

function temizle() {
    db.prepare("DELETE FROM proposal_sends WHERE proposal_code LIKE 'HTEST-%'").run();
    db.prepare("DELETE FROM proposals WHERE code LIKE 'HTEST-%'").run();
    db.prepare("DELETE FROM proposal_links WHERE proposal_code LIKE 'HTEST-%'").run();
}

function teklifEkle(kod, durum) {
    db.prepare(`INSERT INTO proposals (id, org_id, code, customer_name, project_name, total, status,
                payload, created_by, created_at, updated_at)
                VALUES (?, ?, ?, 'Test Musteri', 'Test Proje', 1000, ?, '{}', ?, ?, ?)`)
      .run('id-' + kod, org.id, kod, durum, kullanici.id, simdi, simdi);
}

function gonderimEkle(kod, gunOnce, durum = 'sent') {
    db.prepare(`INSERT INTO proposal_sends (org_id, proposal_code, to_email, sent_by, sent_at, status)
                VALUES (?, ?, 'musteri@ornek.test', ?, ?, ?)`)
      .run(org.id, kod, kullanici.id, simdi - gunOnce * GUN, durum);
}

temizle();

// Ayari ac, 3 gun
db.prepare('UPDATE organizations SET reminder_enabled = 1, reminder_days = 3 WHERE id = ?').run(org.id);

// A: 5 gun once gonderildi, hâlâ bekliyor  -> HATIRLATMALI
teklifEkle('HTEST-A', 'Beklemede');       gonderimEkle('HTEST-A', 5);
// B: 1 gun once gonderildi                -> henuz erken
teklifEkle('HTEST-B', 'Beklemede');       gonderimEkle('HTEST-B', 1);
// C: 5 gun once, ama musteri KABUL etti   -> gonderme
teklifEkle('HTEST-C', 'Kabul');           gonderimEkle('HTEST-C', 5);
// D: 5 gun once, hatirlatma ZATEN gitti   -> tekrar gonderme
teklifEkle('HTEST-D', 'Beklemede');       gonderimEkle('HTEST-D', 5); gonderimEkle('HTEST-D', 2, 'reminder');
// E: hic gonderilmemis teklif             -> gonderme (kaydi yok)
teklifEkle('HTEST-E', 'Beklemede');
// F: 5 gun once, musteri onay linkinden KARAR verdi -> gonderme
teklifEkle('HTEST-F', 'Beklemede');       gonderimEkle('HTEST-F', 5);
db.prepare(`INSERT INTO proposal_links (token_hash, org_id, proposal_code, html, created_at, expires_at, decided_at, decision)
            VALUES ('htest-f-hash', ?, 'HTEST-F', '<p>x</p>', ?, ?, ?, 'accepted')`)
  .run(org.id, simdi, simdi + 30 * GUN, simdi);

const secilen = bekleyenleriBul(simdi).map(r => r.proposal_code).filter(k => k.startsWith('HTEST-'));
console.log('AYAR ACIK  -> secilenler:', JSON.stringify(secilen));
console.log('  beklenen : ["HTEST-A"]');
const gecti1 = JSON.stringify(secilen) === '["HTEST-A"]';
console.log('  SONUC    :', gecti1 ? 'GECTI' : 'KALDI');
if (!gecti1) global.__hata = true;

// Ayar kapaliyken hicbir sey secilmemeli
db.prepare('UPDATE organizations SET reminder_enabled = 0 WHERE id = ?').run(org.id);
const kapali = bekleyenleriBul(simdi).map(r => r.proposal_code).filter(k => k.startsWith('HTEST-'));
console.log('\nAYAR KAPALI -> secilenler:', JSON.stringify(kapali));
const gecti2 = kapali.length === 0;
console.log('  SONUC    :', gecti2 ? 'GECTI' : 'KALDI');
if (!gecti2) global.__hata = true;

temizle();
db.prepare('UPDATE organizations SET reminder_enabled = 0 WHERE id = ?').run(org.id);
console.log('\nTest verisi temizlendi.');

// Cikis kodu: CI ya da elle calistirmada basarisizlik gorunur olsun.
process.exit(global.__hata ? 1 : 0);
