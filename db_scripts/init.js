const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'db', 'database.sqlite');
const db = new Database(dbPath);

// Create Tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT,              -- Google ile gelen hesaplarda bos olur
        google_id TEXT UNIQUE,
        display_name TEXT,
        company_name TEXT,
        industry_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        price REAL,
        unit TEXT DEFAULT 'Adet',
        description TEXT,
        conditions TEXT,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS proposals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        code TEXT NOT NULL,
        customer_name TEXT,
        total_amount REAL,
        items_json TEXT,
        status TEXT DEFAULT 'pending',
        date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS kanban (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        list_name TEXT NOT NULL,
        cards_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );

    -- Tüm uygulama verisinin bulut anlık görüntüsü (tek işletme = tek satır id=1)
    CREATE TABLE IF NOT EXISTS sync_store (
        id INTEGER PRIMARY KEY,
        data TEXT,
        updated_at INTEGER
    );
`);

// ---------------------------------------------------------------------------
// Cok kullanicili yapiya gecis
// ---------------------------------------------------------------------------

// users.password NOT NULL idi; Google ile gelen hesabin sifresi olmaz.
// SQLite sutun tipini degistiremedigi icin tabloyu yeniden kuruyoruz.
const usersSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
if (usersSql && /password\s+TEXT\s+NOT\s+NULL/i.test(usersSql.sql)) {
    console.log('Migrating users table (password nullable + google_id)...');
    db.exec(`
        CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT,
            google_id TEXT UNIQUE,
            display_name TEXT,
            company_name TEXT,
            industry_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO users_new (id, email, password, company_name, industry_id, created_at)
            SELECT id, email, password, company_name, industry_id, created_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
    `);
    console.log('users table migrated.');
}

db.exec(`
    -- Her kullanicinin kendi localStorage anlik goruntusu (A yolu: kullanici basina blok)
    CREATE TABLE IF NOT EXISTS user_sync (
        user_id INTEGER PRIMARY KEY,
        data TEXT,
        updated_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- Gunluk kullanim sayaclari: AI gorseli ve mail bizim faturamiza yazildigi icin
    -- kullanici basina siniri burada tutuyoruz.
    CREATE TABLE IF NOT EXISTS usage_counters (
        user_id INTEGER NOT NULL,
        day TEXT NOT NULL,          -- YYYY-MM-DD
        kind TEXT NOT NULL,         -- 'ai_image' | 'email' | 'pdf'
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, day, kind)
    );
`);

// E-posta dogrulama bayragi. Dogrulanmamis hesap girebilir ama musteriye
// e-posta GONDEREMEZ; kotuye kullanimin gercek zarari orada.
const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (!userCols.includes('email_verified')) {
    db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0");
    // Google ile gelen hesaplarin e-postasini Google zaten dogruluyor.
    db.exec("UPDATE users SET email_verified = 1 WHERE google_id IS NOT NULL");
    console.log('users.email_verified eklendi');
}
if (!userCols.includes('kvkk_accepted_at')) {
    db.exec("ALTER TABLE users ADD COLUMN kvkk_accepted_at INTEGER");
    console.log('users.kvkk_accepted_at eklendi');
}

db.exec(`
    -- Sifre sifirlama ve e-posta dogrulama jetonlari.
    -- Jetonun KENDISI degil, SHA-256 ozeti saklanir: veritabani sizarsa eldeki
    -- ozetlerle hesap ele gecirilemez (parola saklamakla ayni mantik).
    CREATE TABLE IF NOT EXISTS auth_tokens (
        token_hash TEXT PRIMARY KEY,
        user_id    INTEGER NOT NULL,
        kind       TEXT NOT NULL,          -- 'reset' | 'verify'
        expires_at INTEGER NOT NULL,
        used_at    INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens (user_id, kind);
`);

// Suresi gecmis jetonlari acilista temizle; bu tablonun sinirsiz buyumesi icin
// bir sebep yok ve eski jetonlar sadece risk tasir.
db.prepare('DELETE FROM auth_tokens WHERE expires_at < ?').run(Date.now());

// ---------------------------------------------------------------------------
// Ekip (organizasyon) yapisi
// ---------------------------------------------------------------------------
// Neden tek JSON blogundan cikiyoruz:
//
// Blok modelinde her gonderim sunucudaki verinin TAMAMINI degistiriyor. Tek
// kullanicida bu yalnizca kendi cihazlari arasinda risk; iki kisi ayni anda
// calisinca gunluk veri kaybi olur — A musteri ekler, 3 saniye sonra B teklif
// kaydeder, B'nin gonderimi A'nin musterisini de siler.
//
// Cozum: sik degisen varliklar (musteriler, teklifler) GERCEK TABLOLARA;
// seyrek degisenler (hizmet katalogu, firma bilgisi, referanslar, pano)
// org_data'da ayri ayri satirlarda ve HER BIRI KENDI SURUMUYLE tutulur.
// Boylece A hizmet listesini duzenlerken B pano surukleyebilir: farkli
// satirlar, catisma yok. Ayni satiri ayni anda degistirirlerse surum
// uyusmazligi 409 doner ve kullaniciya "yeniden yukle" denir — sessiz kayip
// yerine gorunur uyari.
// Eski semadan kalan kullanilmayan tablolar: services / proposals / kanban.
// Bunlarin route'lari (routes/services.js vb.) server.js'e hic mount edilmedi,
// tek satir veri yazilmadi. Yeni `proposals` tablosu ayni adi tasidigi icin
// CREATE TABLE IF NOT EXISTS sessizce atlanir ve ardindan gelen indeks
// "no such column: org_id" ile patlar. Bu yuzden once temizliyoruz.
//
// Guvenlik: YALNIZCA bos ve eski semaya ait (user_id sutunlu) olanlar dusuruluyor.
for (const t of ['proposals', 'services', 'kanban']) {
    const varMi = db.prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?"
    ).get(t);
    if (!varMi) continue;

    const sutunlar = db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name);
    if (!sutunlar.includes('user_id')) continue;      // zaten yeni sema

    const adet = db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
    if (adet > 0) {
        console.warn(`UYARI: eski ${t} tablosunda ${adet} satir var, dusurulmedi.`);
        continue;
    }
    db.exec(`DROP TABLE ${t}`);
    console.log(`Kullanilmayan eski tablo dusuruldu: ${t}`);
}

db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT,
        owner_user_id INTEGER,
        created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS org_members (
        org_id    INTEGER NOT NULL,
        user_id   INTEGER NOT NULL,
        role      TEXT NOT NULL DEFAULT 'member',   -- 'owner' | 'member'
        joined_at INTEGER NOT NULL,
        PRIMARY KEY (org_id, user_id),
        FOREIGN KEY (org_id)  REFERENCES organizations (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id)         ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members (user_id);

    -- Davetlerde de jetonun kendisi degil SHA-256 ozeti saklanir (auth_tokens
    -- ile ayni gerekce): veritabani sizsa bile davet baglantisi uretilemez.
    CREATE TABLE IF NOT EXISTS org_invites (
        token_hash  TEXT PRIMARY KEY,
        org_id      INTEGER NOT NULL,
        email       TEXT NOT NULL,
        role        TEXT NOT NULL DEFAULT 'member',
        invited_by  INTEGER,
        expires_at  INTEGER NOT NULL,
        accepted_at INTEGER,
        created_at  INTEGER NOT NULL,
        FOREIGN KEY (org_id) REFERENCES organizations (id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_org_invites_org ON org_invites (org_id);

    -- Seyrek degisen paylasimli veriler; her anahtar kendi surumunu tasir.
    CREATE TABLE IF NOT EXISTS org_data (
        org_id     INTEGER NOT NULL,
        key        TEXT NOT NULL,          -- company | services | products | refs | kanban | price_history
        value      TEXT NOT NULL,
        version    INTEGER NOT NULL DEFAULT 1,
        updated_at INTEGER NOT NULL,
        updated_by INTEGER,
        PRIMARY KEY (org_id, key),
        FOREIGN KEY (org_id) REFERENCES organizations (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS customers (
        id         TEXT NOT NULL,
        org_id     INTEGER NOT NULL,
        name       TEXT NOT NULL,
        phone      TEXT,
        email      TEXT,
        address    TEXT,
        updated_at INTEGER NOT NULL,
        created_by INTEGER,
        PRIMARY KEY (org_id, id),
        FOREIGN KEY (org_id) REFERENCES organizations (id) ON DELETE CASCADE
    );

    -- Teklif ayri satirda: "kim olusturdu" bilgisi, musteri onay baglantisi ve
    -- sunucu tarafi raporlama ancak boyle mumkun. payload, teklif kalemlerinin
    -- tamami (frontend'in bekledigi sekil aynen korunuyor).
    CREATE TABLE IF NOT EXISTS proposals (
        id            TEXT NOT NULL,
        org_id        INTEGER NOT NULL,
        code          TEXT NOT NULL,
        customer_name TEXT,
        project_name  TEXT,
        total         REAL,
        status        TEXT DEFAULT 'Beklemede',
        payload       TEXT NOT NULL,
        created_by    INTEGER,
        created_at    INTEGER NOT NULL,
        updated_at    INTEGER NOT NULL,
        PRIMARY KEY (org_id, id),
        FOREIGN KEY (org_id) REFERENCES organizations (id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_code ON proposals (org_id, code);
    CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON proposals (created_by);

    -- Gonderim kaydi: "bu teklifi kim, ne zaman, kime gonderdi" sorusunun
    -- cevabi hicbir yerde tutulmuyordu (gonder ve unut).
    CREATE TABLE IF NOT EXISTS proposal_sends (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id        INTEGER NOT NULL,
        proposal_code TEXT,
        to_email      TEXT NOT NULL,
        sent_by       INTEGER,
        sent_at       INTEGER NOT NULL,
        status        TEXT NOT NULL DEFAULT 'sent',   -- sent | failed
        error         TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sends_org ON proposal_sends (org_id, sent_at);

    -- Musteri onay baglantisi.
    --
    -- Teklif gonderildikten sonra "kabul mu, ret mi" bilgisi telefonda ya da
    -- e-postada kaliyor, sisteme elle isleniyor ya da hic islenmiyordu. Bu
    -- baglantiyla musteri tarayicidan onaylayip imzaliyor; teklif kendiliginden
    -- 'Kabul Edildi' oluyor ve ne zaman acildigi da goruluyor.
    --
    -- token_hash: jetonun kendisi degil SHA-256 ozeti saklanir (auth_tokens ve
    -- org_invites ile ayni gerekce): veritabani sizsa bile gecerli bir onay
    -- baglantisi uretilemez.
    --
    -- html: teklifin MUSTERIYE GIDEN hâli; PDF'e giden HTML'in aynisi. Govdeden
    -- yeniden uretmek yerine bunu saklamamizin sebebi guvenlik: govde maliyet ve
    -- ozel not tasiyor, bu HTML tasimiyor (bkz. captureProposalHtml).
    CREATE TABLE IF NOT EXISTS proposal_links (
        token_hash    TEXT PRIMARY KEY,
        org_id        INTEGER NOT NULL,
        proposal_code TEXT NOT NULL,
        proposal_id   TEXT,
        customer_name TEXT,
        project_name  TEXT,
        total         REAL,
        html          TEXT NOT NULL,
        created_by    INTEGER,
        created_at    INTEGER NOT NULL,
        expires_at    INTEGER NOT NULL,
        opened_at     INTEGER,
        open_count    INTEGER NOT NULL DEFAULT 0,
        decided_at    INTEGER,
        decision      TEXT,                      -- accepted | rejected
        decision_note TEXT,
        signer_name   TEXT,
        signature     TEXT,                      -- data:image/png;base64,...
        revoked_at    INTEGER,
        -- Baglantinin uretildigi genel adres. Hatirlatma servisi arka planda
        -- calisiyor ve elinde bir HTTP istegi yok; adresi bir ortam degiskenine
        -- baglamak yerine, kullanicinin ilk baglantiyi olusturdugu adresi
        -- saklayip yeniden kullaniyoruz. Boylece yapilandirma gerekmiyor.
        origin        TEXT,
        FOREIGN KEY (org_id) REFERENCES organizations (id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_links_org ON proposal_links (org_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_links_code ON proposal_links (org_id, proposal_code);
`);

// Her kullaniciya kendi organizasyonunu ver ve blok verisini yeni yapiya tasi.
// Idempotent: zaten organizasyonu olan kullanici atlanir.
// Ekipteki calisanlar maliyet ve kar marjini gorsun mu?
//
// Varsayilan EVET: ekip birlikte fiyatlandirma yapabilsin diye. Ama her isletme
// boyle calismaz — cogu patron calisanin marji gormesini istemez. Bu yuzden
// sahip kapatabiliyor.
//
// KRITIK: bu ayar yalnizca arayuzde gizlemekle yetinemez. Kapaliyken sunucu,
// maliyeti ve kar bilgisini yanittan CIKARIR (bkz. routes/data.js); aksi halde
// calisan tarayici konsolunu acip ham veriden okurdu.
const orgCols = db.prepare("PRAGMA table_info(organizations)").all().map(c => c.name);
if (!orgCols.includes('member_sees_profit')) {
    db.exec("ALTER TABLE organizations ADD COLUMN member_sees_profit INTEGER NOT NULL DEFAULT 1");
    console.log('organizations.member_sees_profit eklendi');
}

// Kullanicinin KENDI e-posta hesabindan gonderim.
//
// Varsayilan davranista zarfin gonderen adresi bizim dogrulanmis adresimiz;
// musteri dogru ismi gorur ve yanit dogru kisiye gider ama Gmail bunu
// "via <bizim alan adimiz>" diye gosterir. Kucuk isletmeler icin bu, teklifin
// baskasi adina gonderilmis gibi gorunmesi demek.
//
// Bu alanlar doluysa gonderim kullanicinin kendi SMTP hesabindan yapilir:
// musteri, tanidigi adresten gelen bir e-posta gorur.
//
// smtp_pass_enc: sifre DUZ METIN TUTULMAZ, AES-256-GCM ile sifrelenir
// (services/secret-box.js). Veritabani yedegi sizarsa kullanicinin e-posta
// sifresi de sizmis olurdu.
const userCols2 = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
for (const [sutun, tanim] of [
    ['smtp_host', 'TEXT'],
    ['smtp_port', 'INTEGER'],
    ['smtp_secure', 'INTEGER'],
    ['smtp_user', 'TEXT'],
    ['smtp_pass_enc', 'TEXT'],
    ['smtp_from', 'TEXT'],
    ['smtp_checked_at', 'INTEGER']
]) {
    if (!userCols2.includes(sutun)) {
        db.exec(`ALTER TABLE users ADD COLUMN ${sutun} ${tanim}`);
        console.log(`users.${sutun} eklendi`);
    }
}

// Var olan kurulumlarda proposal_links tablosuna origin sutununu ekle.
const linkCols = db.prepare("PRAGMA table_info(proposal_links)").all().map(c => c.name);
if (linkCols.length && !linkCols.includes('origin')) {
    db.exec("ALTER TABLE proposal_links ADD COLUMN origin TEXT");
    console.log('proposal_links.origin eklendi');
}

// Otomatik hatirlatma ayarlari.
// Cevap vermeyen musteriye elle hatirlatma yazmak unutuluyor ve teklif sessizce
// oluyor. Varsayilan KAPALI: kullanicinin haberi olmadan musterisine e-posta
// gitmesi kabul edilemez; once bilerek acmali.
if (!orgCols.includes('reminder_enabled')) {
    db.exec("ALTER TABLE organizations ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 0");
    console.log('organizations.reminder_enabled eklendi');
}
if (!orgCols.includes('reminder_days')) {
    db.exec("ALTER TABLE organizations ADD COLUMN reminder_days INTEGER NOT NULL DEFAULT 3");
    console.log('organizations.reminder_days eklendi');
}

function ensureOrgFor(userId) {
    const mevcut = db.prepare('SELECT org_id FROM org_members WHERE user_id = ?').get(userId);
    if (mevcut) return mevcut.org_id;

    const u = db.prepare('SELECT company_name, email FROM users WHERE id = ?').get(userId);
    if (!u) return null;

    const now = Date.now();
    const orgId = db.prepare(
        'INSERT INTO organizations (name, owner_user_id, created_at) VALUES (?, ?, ?)'
    ).run(u.company_name || u.email, userId, now).lastInsertRowid;

    db.prepare(
        "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)"
    ).run(orgId, userId, now);

    return orgId;
}

// Blok -> tablolar. Veri kaybetmemek icin blok SILINMIYOR, sadece kopyalaniyor;
// bir sorun cikarsa eski kayittan geri donulebilir.
const ORG_DATA_KEYS = {
    teklif_company: 'company',
    teklif_services: 'services',
    teklif_products: 'products',
    teklif_refs: 'refs',
    teklif_kanban: 'kanban',
    teklif_price_history: 'price_history',
    teklif_templates: 'templates'
};

function migrateBlobToOrg(userId, orgId) {
    const row = db.prepare('SELECT data FROM user_sync WHERE user_id = ?').get(userId);
    if (!row || !row.data) return false;

    let blob;
    try { blob = JSON.parse(row.data); } catch (e) { return false; }

    const now = Date.now();
    const putData = db.prepare(`
        INSERT INTO org_data (org_id, key, value, version, updated_at, updated_by)
        VALUES (?, ?, ?, 1, ?, ?)
        ON CONFLICT(org_id, key) DO NOTHING
    `);
    for (const [blobKey, orgKey] of Object.entries(ORG_DATA_KEYS)) {
        if (blob[blobKey] != null) putData.run(orgId, orgKey, blob[blobKey], now, userId);
    }

    const putCustomer = db.prepare(`
        INSERT INTO customers (id, org_id, name, phone, email, address, updated_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(org_id, id) DO NOTHING
    `);
    try {
        for (const c of JSON.parse(blob.teklif_customers || '[]')) {
            if (!c || !c.name) continue;
            putCustomer.run(String(c.id || ('c' + Math.random().toString(36).slice(2))), orgId,
                c.name, c.phone || '', c.email || '', c.address || '', c.updatedAt || now, userId);
        }
    } catch (e) { console.error('Musteri tasima hatasi:', e.message); }

    const putProposal = db.prepare(`
        INSERT INTO proposals (id, org_id, code, customer_name, project_name, total, status,
                               payload, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(org_id, id) DO NOTHING
    `);
    try {
        for (const t of JSON.parse(blob.teklif_saved || '[]')) {
            if (!t || !t.code) continue;
            putProposal.run(String(t.id || now), orgId, t.code, t.customerName || '',
                t.projectName || '', t.total || 0, t.status || 'Beklemede',
                JSON.stringify(t), userId, t.createdAt || now, now);
        }
    } catch (e) { console.error('Teklif tasima hatasi:', e.message); }

    return true;
}

// Acilista: organizasyonu olmayan her kullanici icin kur ve tasi.
const orgsuz = db.prepare(`
    SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM org_members)
`).all();
if (orgsuz.length) {
    console.log(`${orgsuz.length} kullanici icin organizasyon olusturuluyor...`);
    const tx = db.transaction(() => {
        for (const u of orgsuz) {
            const orgId = ensureOrgFor(u.id);
            if (orgId) migrateBlobToOrg(u.id, orgId);
        }
    });
    tx();
    console.log('Organizasyon gecisi tamamlandi.');
}

// Tek kullanicili donemden kalan sync_store (id=1) hala duruyorsa, ilk kayit olan
// kullanici onu devralir. Devralinca satir silinir; bu ayni zamanda "devralindi"
// isaretidir, ayri bir bayrak tutmaya gerek kalmaz.
function claimLegacySync(userId) {
    const legacy = db.prepare('SELECT data, updated_at FROM sync_store WHERE id = 1').get();
    if (!legacy || !legacy.data) return false;

    // Eski veri, tek isletmelik donemin GERCEK musteri ve tekliflerini iceriyor.
    // "Ilk kayit olan devralir" kurali, site herkese acikken bir yabancinin once
    // davranip bu verinin tamamini almasi demekti. OWNER_EMAIL tanimliysa yalnizca
    // o adres devralabilir; kayit sirasi onemini yitirir.
    const owner = (process.env.OWNER_EMAIL || '').toLowerCase().trim();
    if (owner) {
        const u = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
        if (!u || String(u.email).toLowerCase() !== owner) return false;
    }
    const already = db.prepare('SELECT 1 FROM user_sync WHERE user_id = ?').get(userId);
    if (already) return false;
    db.prepare('INSERT INTO user_sync (user_id, data, updated_at) VALUES (?, ?, ?)')
        .run(userId, legacy.data, legacy.updated_at || Date.now());
    db.prepare('DELETE FROM sync_store WHERE id = 1').run();
    console.log(`Legacy single-tenant data claimed by user ${userId}.`);
    return true;
}

console.log('Database initialized successfully.');

// Migration: Add new columns to existing services table if missing
try {
    db.exec(`ALTER TABLE services ADD COLUMN unit TEXT DEFAULT 'Adet'`);
    console.log('Added unit column to services table');
} catch (e) { /* Column already exists */ }

try {
    db.exec(`ALTER TABLE services ADD COLUMN conditions TEXT`);
    console.log('Added conditions column to services table');
} catch (e) { /* Column already exists */ }

module.exports = db;
module.exports.claimLegacySync = claimLegacySync;
module.exports.ensureOrgFor = ensureOrgFor;
module.exports.migrateBlobToOrg = migrateBlobToOrg;
module.exports.ORG_DATA_KEYS = ORG_DATA_KEYS;
