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

// Tek kullanicili donemden kalan sync_store (id=1) hala duruyorsa, ilk kayit olan
// kullanici onu devralir. Devralinca satir silinir; bu ayni zamanda "devralindi"
// isaretidir, ayri bir bayrak tutmaya gerek kalmaz.
function claimLegacySync(userId) {
    const legacy = db.prepare('SELECT data, updated_at FROM sync_store WHERE id = 1').get();
    if (!legacy || !legacy.data) return false;
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
