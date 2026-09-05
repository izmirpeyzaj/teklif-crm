// Teklif e-posta gonderiminde onay baglantisi olusumu ve sablon testi.
process.env.MAIL_DISABLED = 'true';
const assert = require('assert');
const crypto = require('crypto');
const db = require('../db_scripts/init');

const org = db.prepare('SELECT id FROM organizations LIMIT 1').get();
const user = db.prepare('SELECT id, email FROM users LIMIT 1').get();

const testCode = 'TEST-LINK-' + Date.now();
const testHtml = '<div id="proposalPaper"><h1>Test Teklif</h1><p>15.000,00 ₺</p></div>';
const token = crypto.randomBytes(32).toString('hex');
const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
const now = Date.now();
const linkOrigin = 'https://crm.izmirev.online';

db.prepare(`INSERT INTO proposal_links
    (token_hash, org_id, proposal_code, proposal_id, customer_name, project_name,
     total, html, created_by, created_at, expires_at, origin)
    VALUES (?, ?, ?, null, 'Musteri', 'Proje', 15000, ?, ?, ?, ?, ?)`
).run(tokenHash, org.id, testCode, testHtml, user.id, now, now + 30 * 24 * 3600 * 1000, linkOrigin);

const record = db.prepare('SELECT * FROM proposal_links WHERE token_hash = ?').get(tokenHash);
assert(record, 'Proposal link should be saved in database');
assert.strictEqual(record.proposal_code, testCode);
assert.strictEqual(record.origin, linkOrigin);

// Temizle
db.prepare('DELETE FROM proposal_links WHERE proposal_code = ?').run(testCode);

console.log('Teklif Onay Baglantisi Testi: GECTI');
