// Basit, sunucu tarafı şifre kapısı.
// Şifre .env / Coolify'daki SITE_PASSWORD'dan gelir (public repoda değil).
// Doğru şifre girilince imzalı (HMAC) HttpOnly bir çerez verilir; kaynak koddan bypass edilemez.
const crypto = require('crypto');

const SITE_PASSWORD = process.env.SITE_PASSWORD || '1234';
const SECRET = process.env.JWT_SECRET || 'teklif-io-secret-key-12345';
// Çerez değeri şifreyi içermez; şifre + secret'tan türetilen imzadır.
const TOKEN = crypto.createHmac('sha256', SECRET).update('site-gate:' + SITE_PASSWORD).digest('hex');
const COOKIE = 'site_auth';

// Şifresiz erişilebilecek yollar (sağlık kontrolü + giriş ucu)
const PUBLIC_PATHS = new Set(['/api/health', '/__auth', '/__logout']);

function getCookie(header, name) {
    if (!header) return null;
    const part = header.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
    return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
}

function loginPage() {
    return `<!doctype html><html lang="tr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Giriş — Teklif Sistemi</title>
<style>
*{box-sizing:border-box} body{margin:0;font-family:system-ui,'Segoe UI',Roboto,sans-serif;
 background:linear-gradient(135deg,#1e3a2f,#2e7d32);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
.card{background:#fff;padding:40px 34px;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.3);width:340px;max-width:100%;text-align:center}
.logo{font-size:46px;margin-bottom:6px}
h1{font-size:21px;margin:0 0 4px;color:#1b5e20}
p{color:#888;font-size:13px;margin:0 0 24px}
input{width:100%;padding:13px 14px;border:2px solid #e3e3e3;border-radius:10px;font-size:16px;outline:none;transition:.2s}
input:focus{border-color:#2e7d32}
button{width:100%;margin-top:14px;padding:13px;border:0;border-radius:10px;background:#2e7d32;color:#fff;font-size:16px;font-weight:600;cursor:pointer;transition:.2s}
button:hover{background:#1b5e20}
.err{color:#c62828;font-size:13px;margin-top:12px;min-height:16px}
</style></head><body>
<form class="card" onsubmit="return doLogin(event)">
 <div class="logo">🌿</div>
 <h1>Teklif Sistemi</h1>
 <p>Devam etmek için şifrenizi girin</p>
 <input id="pw" type="password" placeholder="Şifre" autofocus autocomplete="current-password">
 <button type="submit">Giriş Yap</button>
 <div class="err" id="err"></div>
</form>
<script>
async function doLogin(e){
  e.preventDefault();
  var err=document.getElementById('err'); err.textContent='';
  var pw=document.getElementById('pw');
  var r=await fetch('/__auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw.value})});
  if(r.ok){ location.replace('/'); }
  else { err.textContent='Hatalı şifre, tekrar deneyin.'; pw.value=''; pw.focus(); }
  return false;
}
</script>
</body></html>`;
}

module.exports = function installGate(app) {
    // Giriş ucu — geçerli çerez olmadan da erişilebilir olmalı
    app.post('/__auth', (req, res) => {
        const pw = (req.body && req.body.password) || '';
        if (pw === SITE_PASSWORD) {
            res.setHeader('Set-Cookie', `${COOKIE}=${TOKEN}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
            return res.json({ ok: true });
        }
        return res.status(401).json({ ok: false, message: 'Hatalı şifre' });
    });

    // Çıkış
    app.post('/__logout', (req, res) => {
        res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
        res.json({ ok: true });
    });

    // Geri kalan her şeyi koru
    app.use((req, res, next) => {
        if (PUBLIC_PATHS.has(req.path)) return next();
        if (getCookie(req.headers.cookie, COOKIE) === TOKEN) return next();
        if (req.path.startsWith('/api/')) return res.status(401).json({ message: 'Yetkisiz. Giriş gerekli.' });
        return res.status(401).type('html').send(loginPage());
    });
};
