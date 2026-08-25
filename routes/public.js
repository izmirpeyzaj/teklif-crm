const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('../db_scripts/init');
const { rateLimiter } = require('../services/rate-limit');
// Projede cookie-parser yok; oturum katmani kendi okuyucusunu kullaniyor.
const { getCookie } = require('../services/session');

// ---------------------------------------------------------------------------
// Musteri onay baglantisi — GIRIS GEREKTIRMEZ
// ---------------------------------------------------------------------------
// Buradaki her sey internete acik. Iki kural:
//
//   1. Jeton tek kimlik dogrulama araci. Bu yuzden 32 bayt rastgele ve
//      veritabaninda yalnizca SHA-256 ozeti duruyor.
//   2. Ic bilgi (maliyet, kar, ozel not) buraya HIC gelmiyor. Musteriye
//      gosterdigimiz sey, teklif olusturulurken kaydedilen ve PDF'e giden
//      HTML'in ta kendisi. Teklif govdesini burada acmiyoruz ki maliyet
//      alanlarinin sizma ihtimali dogmasin.

const LINK_COOKIE = 'teklif_link';

// Jeton tahminine karsi. Baglanti acmak ucuz, ama deneme yanilma pahali olsun.
const acmaLimiti = rateLimiter({ windowMs: 10 * 60 * 1000, max: 60,
    message: 'Cok fazla istek. Lutfen birkac dakika sonra tekrar deneyin.' });
const kararLimiti = rateLimiter({ windowMs: 60 * 60 * 1000, max: 20,
    message: 'Cok fazla deneme. Lutfen daha sonra tekrar deneyin.' });

function hash(t) {
    return crypto.createHash('sha256').update(String(t)).digest('hex');
}

function kacis(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function baglantiBul(token) {
    if (!token || !/^[a-f0-9]{64}$/i.test(String(token))) return null;
    const b = db.prepare('SELECT * FROM proposal_links WHERE token_hash = ?').get(hash(token));
    if (!b) return null;
    if (b.revoked_at) return { ...b, gecersiz: 'iptal' };
    if (b.expires_at < Date.now()) return { ...b, gecersiz: 'suresi_doldu' };
    return b;
}

function hataSayfasi(res, kod, baslik, mesaj) {
    res.status(kod).type('html').send(`<!doctype html><html lang="tr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${kacis(baslik)}</title></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; background:#f1f5f9; margin:0; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:20px;">
<div style="background:#fff; border-radius:14px; padding:34px 30px; max-width:440px; text-align:center; box-shadow:0 6px 24px rgba(0,0,0,.08);">
  <div style="font-size:2.4rem; margin-bottom:10px;">🔗</div>
  <h1 style="font-size:1.12rem; margin:0 0 10px; color:#0f172a;">${kacis(baslik)}</h1>
  <p style="color:#64748b; font-size:.9rem; line-height:1.55; margin:0;">${kacis(mesaj)}</p>
</div></body></html>`);
}

// ---------------------------------------------------------------------------
// GET /t/:token — musterinin gordugu sayfa
// ---------------------------------------------------------------------------
router.get('/t/:token', acmaLimiti, (req, res) => {
    const token = req.params.token;
    const b = baglantiBul(token);

    if (!b) return hataSayfasi(res, 404, 'Bağlantı bulunamadı',
        'Bu teklif bağlantısı geçersiz. Size gönderilen bağlantıyı kontrol edin veya teklifi gönderen firmayla iletişime geçin.');
    if (b.gecersiz === 'iptal') return hataSayfasi(res, 410, 'Bağlantı iptal edildi',
        'Bu teklif bağlantısı firma tarafından iptal edilmiş. Güncel teklif için firmayla iletişime geçin.');
    if (b.gecersiz === 'suresi_doldu') return hataSayfasi(res, 410, 'Bağlantının süresi doldu',
        'Bu teklif bağlantısının geçerlilik süresi dolmuş. Yeni bir bağlantı için firmayla iletişime geçin.');

    // Acilma kaydi. "Musteri teklifi gordu mu" sorusunun cevabi.
    try {
        db.prepare(`UPDATE proposal_links
                    SET open_count = open_count + 1, opened_at = COALESCE(opened_at, ?)
                    WHERE token_hash = ?`).run(Date.now(), b.token_hash);
    } catch (e) { /* sayac tutulamadi diye sayfayi bozma */ }

    // Teklifteki gorseller /uploads altinda ve orasi girise bagli. Musterinin
    // oturumu yok; bu kisa omurlu kurabiye yalnizca BU teklifin gorsellerini
    // acmaya yariyor (bkz. asagidaki linkVarligi middleware'i).
    res.cookie(LINK_COOKIE, token, {
        httpOnly: true, sameSite: 'lax', maxAge: 6 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production', path: '/'
    });

    res.type('html').send(onaySayfasi(b, token));
});

// ---------------------------------------------------------------------------
// Musterinin gordugu HTML
// ---------------------------------------------------------------------------
function onaySayfasi(b, token) {
    const kararVerildi = !!b.decided_at;
    const kabul = b.decision === 'accepted';

    const durumKutusu = kararVerildi
        ? `<div style="background:${kabul ? '#dcfce7' : '#fee2e2'}; border:1px solid ${kabul ? '#86efac' : '#fecaca'}; border-radius:12px; padding:18px 20px; margin-bottom:18px;">
             <div style="font-weight:700; color:${kabul ? '#15803d' : '#b91c1c'}; font-size:1rem;">
               ${kabul ? '✓ Bu teklifi onayladınız' : '✕ Bu teklifi reddettiniz'}
             </div>
             <div style="font-size:.84rem; color:#475569; margin-top:6px;">
               ${new Date(b.decided_at).toLocaleString('tr-TR')}${b.signer_name ? ' · ' + kacis(b.signer_name) : ''}
             </div>
             ${b.signature ? `<img src="${kacis(b.signature)}" alt="İmza" style="margin-top:12px; max-width:220px; background:#fff; border:1px solid #e2e8f0; border-radius:8px;">` : ''}
           </div>`
        : `<div id="kararAlani" style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin-bottom:18px; box-shadow:0 2px 10px rgba(0,0,0,.05);">
             <h2 style="font-size:1.02rem; margin:0 0 4px; color:#0f172a;">Teklifi onaylıyor musunuz?</h2>
             <p style="font-size:.85rem; color:#64748b; margin:0 0 16px;">Onayladığınızda teklifi gönderen firma bilgilendirilir.</p>

             <label style="display:block; font-size:.84rem; font-weight:600; margin-bottom:5px;">Ad Soyad</label>
             <input id="adSoyad" type="text" placeholder="Adınız ve soyadınız" autocomplete="name"
                    style="width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:.92rem; margin-bottom:14px;">

             <label style="display:block; font-size:.84rem; font-weight:600; margin-bottom:5px;">İmzanız</label>
             <div style="border:2px dashed #cbd5e1; border-radius:10px; background:#fff; touch-action:none;">
               <canvas id="imzaAlani" style="width:100%; height:170px; display:block; border-radius:8px; cursor:crosshair;"></canvas>
             </div>
             <div style="display:flex; justify-content:space-between; align-items:center; margin:6px 0 16px;">
               <span style="font-size:.76rem; color:#94a3b8;">Parmağınızla veya farenizle imzalayın</span>
               <button type="button" onclick="imzayiTemizle()" style="background:none; border:none; color:#2563eb; font-size:.8rem; cursor:pointer; padding:4px;">Temizle</button>
             </div>

             <label style="display:block; font-size:.84rem; font-weight:600; margin-bottom:5px;">Not (isteğe bağlı)</label>
             <textarea id="kararNotu" rows="2" placeholder="Eklemek istediğiniz bir şey var mı?"
                       style="width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:.92rem; margin-bottom:16px; font-family:inherit;"></textarea>

             <div id="kararHata" style="display:none; color:#b91c1c; font-size:.84rem; margin-bottom:12px;"></div>

             <div style="display:flex; gap:10px; flex-wrap:wrap;">
               <button type="button" onclick="kararGonder('accepted')" id="btnKabul"
                       style="flex:1 1 160px; padding:13px; border:none; border-radius:9px; background:#16a34a; color:#fff; font-size:.95rem; font-weight:700; cursor:pointer;">✓ Onaylıyorum</button>
               <button type="button" onclick="kararGonder('rejected')" id="btnRet"
                       style="flex:1 1 130px; padding:13px; border:1px solid #cbd5e1; border-radius:9px; background:#fff; color:#475569; font-size:.92rem; cursor:pointer;">Reddet</button>
             </div>
           </div>`;

    // NOT: b.html teklifin musteriye giden hâli. Icinde maliyet/kar/ozel not
    // yok (bkz. captureProposalHtml ve data-internal temizligi).
    // <base href="/">: kaydedilen HTML'deki gorsel yollari goreli
    // (images/services/...). Bu sayfa /t/<jeton> altinda durdugu icin base
    // olmadan /t/images/... diye aranip 404 oluyordu — musteri teklifi kirik
    // gorsellerle goruyordu.
    //
    // style.css: teklif kagidinin duzeni uygulamanin kendi stilinde. Onu
    // yuklemezsek musteri, tablolari dagilmis duz metin goruyor.
    return `<!doctype html><html lang="tr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<base href="/">
<title>Teklif · ${kacis(b.customer_name || '')}</title>
<link rel="stylesheet" href="/style.css">
<style>
  /* style.css uygulama kabugu icin body'yi kilitliyor (overflow:hidden,
     sabit yukseklik) — panolarin kendi icinde kaymasi icin. Bu sayfa normal
     bir dokuman; kilidi acmazsak musteri teklifi hic goremiyor, sayfa
     kaymiyordu. Asagidaki !important'lar bilerek. */
  html, body { overflow:auto !important; height:auto !important; min-height:100% !important; }
  body { margin:0 !important; padding:0 !important; display:block !important;
         background:#eef2f7 !important; font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:#0f172a; }
  .sarmal { max-width:860px; margin:0 auto; padding:18px 14px 60px; }
  .kagit { background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(15,23,42,.09); }
  .kagit img { max-width:100%; height:auto; }
  .kagit table { width:100%; border-collapse:collapse; }
  .ust { display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
  @media print { .karar, .ust { display:none !important; } body { background:#fff; } .kagit { box-shadow:none; } }
</style></head>
<body>
<div class="sarmal">
  <div class="ust">
    <div>
      <div style="font-size:.76rem; color:#64748b; text-transform:uppercase; letter-spacing:.06em;">Teklif</div>
      <div style="font-weight:700; font-size:1.05rem;">${kacis(b.proposal_code)}</div>
    </div>
    <button onclick="window.print()" style="background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:8px 14px; font-size:.84rem; cursor:pointer;">🖨️ Yazdır / PDF</button>
  </div>

  <div class="karar">${durumKutusu}</div>

  <div class="kagit">${b.html}</div>
</div>

<script>
(function () {
  var tuval = document.getElementById('imzaAlani');
  if (!tuval) return;

  // Retina ekranda bulanik imza olmasin diye tuvali gercek piksel oraninda kur.
  var ctx, ciziyor = false, bosMu = true;
  function kur() {
    var oran = window.devicePixelRatio || 1;
    var g = tuval.getBoundingClientRect();
    tuval.width = g.width * oran;
    tuval.height = g.height * oran;
    ctx = tuval.getContext('2d');
    ctx.scale(oran, oran);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }
  kur();
  window.addEventListener('resize', function () { var v = bosMu; kur(); bosMu = v; });

  function nokta(e) {
    var g = tuval.getBoundingClientRect();
    var k = e.touches ? e.touches[0] : e;
    return { x: k.clientX - g.left, y: k.clientY - g.top };
  }
  function basla(e) { e.preventDefault(); ciziyor = true; bosMu = false; var n = nokta(e); ctx.beginPath(); ctx.moveTo(n.x, n.y); }
  function ciz(e) { if (!ciziyor) return; e.preventDefault(); var n = nokta(e); ctx.lineTo(n.x, n.y); ctx.stroke(); }
  function bitir() { ciziyor = false; }

  tuval.addEventListener('mousedown', basla);
  tuval.addEventListener('mousemove', ciz);
  tuval.addEventListener('mouseup', bitir);
  tuval.addEventListener('mouseleave', bitir);
  tuval.addEventListener('touchstart', basla, { passive: false });
  tuval.addEventListener('touchmove', ciz, { passive: false });
  tuval.addEventListener('touchend', bitir);

  window.imzayiTemizle = function () { ctx.clearRect(0, 0, tuval.width, tuval.height); bosMu = true; };
  window._imzaBosMu = function () { return bosMu; };
})();

function hataGoster(m) {
  var e = document.getElementById('kararHata');
  e.textContent = m; e.style.display = 'block';
}

async function kararGonder(karar) {
  var ad = (document.getElementById('adSoyad').value || '').trim();
  var not = (document.getElementById('kararNotu').value || '').trim();
  var tuval = document.getElementById('imzaAlani');

  if (!ad) return hataGoster('Lütfen ad ve soyadınızı yazın.');
  // Imza yalnizca ONAY icin sart; reddederken imza istemek anlamsiz.
  if (karar === 'accepted' && window._imzaBosMu()) return hataGoster('Onaylamak için lütfen imzalayın.');

  var btnK = document.getElementById('btnKabul'), btnR = document.getElementById('btnRet');
  btnK.disabled = btnR.disabled = true;
  btnK.textContent = 'Gönderiliyor…';

  try {
    var r = await fetch(location.pathname + '/karar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: karar, signerName: ad, note: not,
        signature: karar === 'accepted' ? tuval.toDataURL('image/png') : null
      })
    });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) { hataGoster(j.message || 'Gönderilemedi.'); btnK.disabled = btnR.disabled = false; btnK.textContent = '✓ Onaylıyorum'; return; }
    location.reload();
  } catch (e) {
    hataGoster('Bağlantı hatası. Lütfen tekrar deneyin.');
    btnK.disabled = btnR.disabled = false; btnK.textContent = '✓ Onaylıyorum';
  }
}
</script>
</body></html>`;
}

// ---------------------------------------------------------------------------
// POST /t/:token/karar — musterinin kabul/ret + imzasi
// ---------------------------------------------------------------------------
router.post('/t/:token/karar', kararLimiti, express.json({ limit: '2mb' }), (req, res) => {
    const b = baglantiBul(req.params.token);
    if (!b || b.gecersiz) return res.status(404).json({ message: 'Bağlantı geçersiz veya süresi dolmuş.' });

    // Karar bir kez verilir. Aksi halde musteri (ya da baglantiyi ele geciren
    // biri) onayi sessizce geri alabilirdi.
    if (b.decided_at) return res.status(409).json({ message: 'Bu teklif için zaten karar verilmiş.' });

    const { decision, signerName, note, signature } = req.body || {};
    if (decision !== 'accepted' && decision !== 'rejected') {
        return res.status(400).json({ message: 'Geçersiz karar.' });
    }
    const ad = String(signerName || '').trim().slice(0, 120);
    if (!ad) return res.status(400).json({ message: 'Ad soyad gerekli.' });

    let imza = null;
    if (decision === 'accepted') {
        if (typeof signature !== 'string' || !/^data:image\/png;base64,/.test(signature)) {
            return res.status(400).json({ message: 'İmza gerekli.' });
        }
        if (signature.length > 1_500_000) return res.status(413).json({ message: 'İmza çok büyük.' });
        imza = signature;
    }

    try {
        db.prepare(`UPDATE proposal_links
                    SET decided_at = ?, decision = ?, decision_note = ?, signer_name = ?, signature = ?
                    WHERE token_hash = ? AND decided_at IS NULL`)
          .run(Date.now(), decision, String(note || '').slice(0, 1000), ad, imza, b.token_hash);

        // Teklifin durumunu da guncelle ki panoda elle tasimak gerekmesin.
        db.prepare('UPDATE proposals SET status = ?, updated_at = ? WHERE org_id = ? AND code = ?')
          .run(decision === 'accepted' ? 'Kabul Edildi' : 'Reddedildi', Date.now(), b.org_id, b.proposal_code);

        res.json({ ok: true });
    } catch (err) {
        console.error('Karar kaydedilemedi:', err);
        res.status(500).json({ message: 'Kaydedilemedi.' });
    }
});

// ---------------------------------------------------------------------------
// Teklif gorselleri icin dar kapi
// ---------------------------------------------------------------------------
// /uploads girise bagli (URL'i bilen herkes baska bir isletmenin gorsellerini
// acamasin diye). Musterinin oturumu yok. Bu middleware, gecerli bir onay
// baglantisi kurabiyesi tasiyan istege YALNIZCA o baglantinin organizasyonuna
// ait klasoru aciyor. Baska bir isletmenin klasoru yine kapali.
function linkVarligi(req, res, next) {
    const token = getCookie(req.headers.cookie, LINK_COOKIE);
    if (!token) return next();

    const b = baglantiBul(token);
    if (!b || b.gecersiz) return next();

    // /uploads/ai/<userId>/<dosya> — userId baglantinin organizasyonunda mi?
    const parcalar = req.path.split('/').filter(Boolean);
    if (parcalar[0] !== 'ai' || parcalar.length < 3) return next();

    const uye = db.prepare('SELECT 1 FROM org_members WHERE org_id = ? AND user_id = ?')
                  .get(b.org_id, Number(parcalar[1]));
    if (!uye) return next();

    const dosya = path.join(__dirname, '..', 'public', 'uploads', 'ai', String(Number(parcalar[1])), path.basename(parcalar[2]));
    if (!fs.existsSync(dosya)) return next();

    return res.sendFile(dosya);
}

module.exports = router;
module.exports.linkVarligi = linkVarligi;
module.exports.LINK_COOKIE = LINK_COOKIE;
