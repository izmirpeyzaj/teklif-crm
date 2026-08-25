const express = require('express');
const router = express.Router();
const db = require('../db_scripts/init');
const { requireOrg } = require('../services/session');

// ---------------------------------------------------------------------------
// Ekip ici paylasimli veri
// ---------------------------------------------------------------------------
// Eskiden tum veri tek bir JSON blogunda tutuluyordu ve her gonderim bloğun
// TAMAMINI degistiriyordu. Iki kisi ayni anda calisinca son yazan digerini
// sessizce siliyordu.
//
// Simdi iki farkli sekilde tutuluyor:
//
//   * Sik degisenler (musteriler, teklifler) ayri satirlarda. A musteri
//     eklerken B teklif kaydedebilir; birbirine dokunmuyorlar.
//   * Seyrek degisenler (hizmet katalogu, firma bilgisi, pano...) org_data'da
//     anahtar basina SURUMLU. Istemci okudugu surumu geri gonderir; arada
//     baskasi degistirmisse 409 doner ve kullaniciya "yeniden yukle" denir.
//     Sessiz kayip yerine gorunur uyari.

// ---------------------------------------------------------------------------
// Maliyet gorunurlugu
// ---------------------------------------------------------------------------
// Sahip her zaman gorur. Ekip uyesi ancak organizasyon ayari aciksa gorur.
//
// Bu kontrolun SUNUCUDA olmasi sart: arayuzde gizlemek, tarayici konsolunu
// acan bir calisan icin hicbir sey ifade etmez. Kapaliyken maliyet alanlari
// yanittan tamamen cikariliyor.
//
// Ozel not (internalNote) bu ayarin DISINDA: o "ekip ici bilgi", maliyet degil.
// Kullanici ikisini ayri istemisti.
function maliyetGorebilir(user) {
    if (!user) return false;
    if (user.role === 'owner') return true;
    const org = db.prepare('SELECT member_sees_profit FROM organizations WHERE id = ?').get(user.org_id);
    return !org || org.member_sees_profit !== 0;
}

// Maliyet alanlarini teklif govdesinden temizler (kopya uzerinde calisir).
function maliyetiGizle(t) {
    const temiz = Object.assign({}, t);
    const sil = dizi => (dizi || []).map(i => {
        const k = Object.assign({}, i);
        delete k.cost;
        return k;
    });
    temiz.items = sil(t.items);
    temiz.products = sil(t.products);
    temiz.maliyetGizli = true;   // arayuz bunu gorup kar panelini kapatiyor
    return temiz;
}

router.use(requireOrg);

const IZINLI_ANAHTAR = new Set(['company', 'services', 'products', 'refs', 'kanban', 'price_history']);
const MAX_BYTES = 6 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Tumunu getir (acilista bir kez)
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
    try {
        const orgId = req.user.org_id;

        const data = {};
        const versions = {};
        for (const row of db.prepare('SELECT key, value, version FROM org_data WHERE org_id = ?').all(orgId)) {
            data[row.key] = row.value;
            versions[row.key] = row.version;
        }

        const customers = db.prepare(
            'SELECT id, name, phone, email, address, updated_at FROM customers WHERE org_id = ? ORDER BY name'
        ).all(orgId).map(c => ({
            id: c.id, name: c.name, phone: c.phone || '', email: c.email || '',
            address: c.address || '', updatedAt: c.updated_at
        }));

        // Teklifin tum alanlari payload'da; ustune "kim olusturdu" bilgisini
        // ekliyoruz ki arayuz gosterebilsin.
        const gorebilir = maliyetGorebilir(req.user);

        const proposals = db.prepare(`
            SELECT p.payload, p.status, p.created_by, p.created_at,
                   u.email AS creator_email, u.display_name AS creator_name
            FROM proposals p
            LEFT JOIN users u ON u.id = p.created_by
            WHERE p.org_id = ?
            ORDER BY p.created_at
        `).all(orgId).map(r => {
            let t;
            try { t = JSON.parse(r.payload); } catch (e) { return null; }
            t.status = r.status;
            t.createdBy = r.created_by;
            t.createdByName = r.creator_name || r.creator_email || null;
            return gorebilir ? t : maliyetiGizle(t);
        }).filter(Boolean);

        res.json({ data, versions, customers, proposals, canSeeProfit: gorebilir });
    } catch (err) {
        console.error('Veri okuma hatasi:', err);
        res.status(500).json({ message: 'Veri okunamadi.' });
    }
});

// ---------------------------------------------------------------------------
// Surumlu anahtar yazma
// ---------------------------------------------------------------------------
router.put('/key/:key', (req, res) => {
    const key = req.params.key;
    if (!IZINLI_ANAHTAR.has(key)) return res.status(400).json({ message: 'Bilinmeyen anahtar.' });

    const { value, version } = req.body || {};
    if (typeof value !== 'string') return res.status(400).json({ message: 'value (metin) gerekli.' });
    if (Buffer.byteLength(value, 'utf8') > MAX_BYTES) {
        return res.status(413).json({ message: 'Veri cok buyuk. Kullanilmayan gorselleri silin.' });
    }

    try {
        const orgId = req.user.org_id;
        const now = Date.now();
        const mevcut = db.prepare('SELECT version FROM org_data WHERE org_id = ? AND key = ?').get(orgId, key);

        if (!mevcut) {
            db.prepare(`INSERT INTO org_data (org_id, key, value, version, updated_at, updated_by)
                        VALUES (?, ?, ?, 1, ?, ?)`).run(orgId, key, value, now, req.user.id);
            return res.json({ ok: true, version: 1 });
        }

        // Surum gonderilmediyse kor yazma sayilir; ekip modunda buna izin yok.
        if (version == null) return res.status(400).json({ message: 'version gerekli.' });

        if (Number(version) !== mevcut.version) {
            return res.status(409).json({
                message: 'Bu veriyi siz okuduktan sonra ekip arkadasiniz degistirdi. ' +
                         'Sayfayi yenileyip tekrar deneyin.',
                conflict: true,
                key,
                serverVersion: mevcut.version
            });
        }

        const yeni = mevcut.version + 1;
        db.prepare(`UPDATE org_data SET value = ?, version = ?, updated_at = ?, updated_by = ?
                    WHERE org_id = ? AND key = ?`).run(value, yeni, now, req.user.id, orgId, key);
        res.json({ ok: true, version: yeni });
    } catch (err) {
        console.error('Anahtar yazma hatasi:', err);
        res.status(500).json({ message: 'Kaydedilemedi.' });
    }
});

// ---------------------------------------------------------------------------
// Musteriler — tam liste degistirme
// ---------------------------------------------------------------------------
// Satir satir CRUD yerine liste degistirme: arayuz zaten tum listeyi tutuyor ve
// bu sekilde 211KB'lik cizim koduna dokunmaya gerek kalmiyor. Catisma yuzeyi
// yine de eski hâlinden cok kucuk — yalnizca ayni anda musteri duzenleyen iki
// kisi birbirini etkiler, teklif/pano isleri etkilenmez.
router.put('/customers', (req, res) => {
    const list = (req.body || {}).customers;
    if (!Array.isArray(list)) return res.status(400).json({ message: 'customers dizisi gerekli.' });

    try {
        const orgId = req.user.org_id;
        const now = Date.now();
        db.transaction(() => {
            const gelenIds = new Set(list.map(c => String(c.id)));
            for (const row of db.prepare('SELECT id FROM customers WHERE org_id = ?').all(orgId)) {
                if (!gelenIds.has(String(row.id))) {
                    db.prepare('DELETE FROM customers WHERE org_id = ? AND id = ?').run(orgId, row.id);
                }
            }
            const up = db.prepare(`
                INSERT INTO customers (id, org_id, name, phone, email, address, updated_at, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(org_id, id) DO UPDATE SET
                    name = excluded.name, phone = excluded.phone, email = excluded.email,
                    address = excluded.address, updated_at = excluded.updated_at
            `);
            for (const c of list) {
                if (!c || !c.name) continue;
                up.run(String(c.id), orgId, c.name, c.phone || '', c.email || '',
                       c.address || '', c.updatedAt || now, req.user.id);
            }
        })();
        res.json({ ok: true, count: list.length });
    } catch (err) {
        console.error('Musteri yazma hatasi:', err);
        res.status(500).json({ message: 'Musteriler kaydedilemedi.' });
    }
});

// ---------------------------------------------------------------------------
// Teklifler
// ---------------------------------------------------------------------------
router.put('/proposals', (req, res) => {
    const list = (req.body || {}).proposals;
    if (!Array.isArray(list)) return res.status(400).json({ message: 'proposals dizisi gerekli.' });

    try {
        const orgId = req.user.org_id;
        const now = Date.now();
        const gorebilir = maliyetGorebilir(req.user);

        // Maliyeti goremeyen kullanici, maliyetsiz bir kopyayi geri gonderir.
        // Oldugu gibi yazsaydik o teklifin maliyeti SILINIRDI: calisan teklifi
        // acip kaydettiginde patronun girdigi maliyet ucup giderdi. Bu yuzden
        // kaydetmeden once mevcut govdedeki maliyetleri geri koyuyoruz.
        const eskiGovdeler = new Map();
        if (!gorebilir) {
            for (const r of db.prepare('SELECT id, payload FROM proposals WHERE org_id = ?').all(orgId)) {
                try { eskiGovdeler.set(String(r.id), JSON.parse(r.payload)); } catch (e) { /* bozuk kayit: atla */ }
            }
        }
        const maliyetiGeriKoy = (t) => {
            const eski = eskiGovdeler.get(String(t.id));
            if (!eski) return t;
            const birlestir = (yeniDizi, eskiDizi) => (yeniDizi || []).map(i => {
                const e = (eskiDizi || []).find(x => String(x.id) === String(i.id));
                return (e && e.cost != null) ? Object.assign({}, i, { cost: e.cost }) : i;
            });
            const g = Object.assign({}, t);
            g.items = birlestir(t.items, eski.items);
            g.products = birlestir(t.products, eski.products);
            delete g.maliyetGizli;
            return g;
        };

        db.transaction(() => {
            const gelenIds = new Set(list.map(t => String(t.id)));
            for (const row of db.prepare('SELECT id FROM proposals WHERE org_id = ?').all(orgId)) {
                if (!gelenIds.has(String(row.id))) {
                    db.prepare('DELETE FROM proposals WHERE org_id = ? AND id = ?').run(orgId, row.id);
                }
            }
            // created_by KORUNUR: bir teklifi baskasi guncellese bile onu
            // olusturan kisi degismemeli.
            const up = db.prepare(`
                INSERT INTO proposals (id, org_id, code, customer_name, project_name, total,
                                       status, payload, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(org_id, id) DO UPDATE SET
                    code = excluded.code, customer_name = excluded.customer_name,
                    project_name = excluded.project_name, total = excluded.total,
                    status = excluded.status, payload = excluded.payload,
                    updated_at = excluded.updated_at
            `);
            // (org_id, code) benzersiz. Gelen listede ayni kod iki kez varsa
            // tek bir INSERT patlar ve TUM islem geri alinir; yani bir kodun
            // tekrarlanmasi yuzunden kullanicinin butun teklifleri kaydedilmez
            // olurdu. Istemci kodu benzersizlestiriyor, burada da ikinci bir
            // kalkan tutuyoruz: tekrari reddetmek yerine yeniden adlandirip
            // kaydediyoruz ve durumu yanitta bildiriyoruz.
            const gorulen = new Set();
            const yenidenAdlandirilan = [];
            for (const t of list) {
                if (!t || !t.code) continue;
                let kod = String(t.code);
                if (gorulen.has(kod)) {
                    let n = 1;
                    while (gorulen.has(`${kod}-${++n}`) && n < 100);
                    yenidenAdlandirilan.push({ eski: kod, yeni: `${kod}-${n}` });
                    kod = `${kod}-${n}`;
                }
                gorulen.add(kod);
                const temel = gorebilir ? t : maliyetiGeriKoy(t);
                const govde = Object.assign({}, temel, { code: kod });
                up.run(String(t.id), orgId, kod, t.customerName || '', t.projectName || '',
                       t.total || 0, t.status || 'Beklemede', JSON.stringify(govde),
                       t.createdBy || req.user.id, t.createdAt || now, now);
            }
            if (yenidenAdlandirilan.length) {
                console.warn('Tekrar eden teklif kodu yeniden adlandirildi:', yenidenAdlandirilan);
                req._yenidenAdlandirilan = yenidenAdlandirilan;
            }
        })();
        res.json({ ok: true, count: list.length, renamed: req._yenidenAdlandirilan || [] });
    } catch (err) {
        console.error('Teklif yazma hatasi:', err);
        res.status(500).json({ message: 'Teklifler kaydedilemedi.' });
    }
});

// Teklif kodunun ekip icinde benzersizligini kontrol eder.
// Kod musteri+proje unsuzlerinden turetildigi icin cakisabiliyordu:
// "Ali Yilmaz" ve "Ela Yalman" ikisi de LYLM uretiyor.
router.get('/proposals/code-available', (req, res) => {
    const { code, id } = req.query;
    if (!code) return res.status(400).json({ message: 'code gerekli.' });
    const row = db.prepare(
        'SELECT id FROM proposals WHERE org_id = ? AND code = ?'
    ).get(req.user.org_id, String(code));
    res.json({ available: !row || String(row.id) === String(id || '') });
});

// Gonderim gecmisi: "bu teklifi kim, ne zaman, kime gonderdi".
router.get('/sends', (req, res) => {
    const rows = db.prepare(`
        SELECT s.proposal_code, s.to_email, s.sent_at, s.status, s.error,
               u.email AS sender_email, u.display_name AS sender_name
        FROM proposal_sends s
        LEFT JOIN users u ON u.id = s.sent_by
        WHERE s.org_id = ?
        ORDER BY s.sent_at DESC
        LIMIT 200
    `).all(req.user.org_id);
    res.json({ sends: rows });
});

module.exports = router;
