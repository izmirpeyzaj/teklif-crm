const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const { sendProposalEmail, isMailConfigured } = require('../services/mail');
const gate = require('../gate');
const { requireAuth } = require('../services/session');
const quota = require('../services/quota');

// ---------------------------------------------------------------------------
// Headless Chromium (Puppeteer) — lazy singleton so we launch the browser once
// and reuse it for every PDF instead of paying the cold-start cost each time.
// ---------------------------------------------------------------------------
let browserPromise = null;
async function getBrowser() {
    if (!browserPromise) {
        browserPromise = puppeteer.launch({
            headless: true,
            // --disable-dev-shm-usage: Docker'da /dev/shm varsayılan 64MB'dır,
            // Chromium PDF render ederken bunu aşıp çöker. Bu flag /tmp kullandırır.
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            // In Docker/VPS set PUPPETEER_EXECUTABLE_PATH to the system Chromium.
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        }).catch(err => {
            browserPromise = null; // allow retry on next request
            throw err;
        });
    }
    return browserPromise;
}

// Wrap the captured #proposalPaper markup in a full document. <base href> makes
// the proposal's relative asset URLs (images/services/.., assets/.., /uploads/..)
// resolve against the running server, and we reuse the app's own style.css so the
// PDF looks exactly like the on-screen print preview.
function buildDocument(bodyHtml, origin) {
    return `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <base href="${origin}/">
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style> html, body { margin: 0; padding: 0; background: #fff; } </style>
</head>
<body>
    <div class="app-container">
        <main class="preview-panel">${bodyHtml}</main>
    </div>
</body>
</html>`;
}

// The proposal photos are 1024px PNGs (~1.2MB each), which pushed a typical
// proposal PDF past 10MB — too heavy to email. Before printing we redraw each
// photo through the page's own canvas as a JPEG sized to how big it actually
// prints. Two things matter here:
//
//   * size follows the printed box, not the source file. A service thumbnail
//     prints at ~160pt, so a 1024px source carries ~40x the pixels the page can
//     show. PRINT_DPI_FACTOR keeps enough detail to stay crisp on paper.
//   * the crop is baked in and object-fit is switched to `fill`. The cards use
//     `object-fit: cover`, and Chromium re-rasterises a cropped image into a
//     lossless bitmap when printing — ~1MB per photo, which cancelled out the
//     entire downscale. Cropping in the canvas makes the bitmap match its box
//     1:1, so our JPEG is embedded as-is.
//
// Uses only the page's canvas, so no image library dependency; the images are
// same-origin here, so the canvas is not tainted.
const PDF_PRINT_DPI_FACTOR = 2.5;  // ~240 DPI at the printed size
const PDF_IMAGE_QUALITY = 0.82;

async function downscaleImages(page) {
    try {
        const stats = await page.evaluate(async (dpiFactor, quality) => {
            const ready = img => img.complete
                ? Promise.resolve()
                : new Promise(r => { img.onload = r; img.onerror = r; });

            let before = 0, after = 0, count = 0;

            await Promise.all(Array.from(document.images).map(async img => {
                await ready(img);
                if (!img.naturalWidth || !img.naturalHeight) return;

                const rect = img.getBoundingClientRect();
                if (rect.width < 1 || rect.height < 1) return;

                const cover = getComputedStyle(img).objectFit === 'cover';
                const boxRatio = rect.width / rect.height;

                // Source rectangle: the whole image, or the centre crop `cover` shows.
                let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
                if (cover) {
                    if (sw / sh > boxRatio) {
                        sw = sh * boxRatio;
                        sx = (img.naturalWidth - sw) / 2;
                    } else {
                        sh = sw / boxRatio;
                        sy = (img.naturalHeight - sh) / 2;
                    }
                }

                // Never upscale past what the source actually holds.
                const targetW = Math.round(Math.min(sw, rect.width * dpiFactor));
                const targetH = Math.round(targetW / boxRatio);
                if (targetW < 1 || targetH < 1) return;
                // Nothing to gain if it is already at (or below) print size.
                if (!cover && targetW >= img.naturalWidth) return;

                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = targetW;
                    canvas.height = targetH;
                    const ctx = canvas.getContext('2d');
                    // JPEG has no alpha; paint white first so transparent PNGs
                    // do not come out with black backgrounds.
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, targetW, targetH);
                    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

                    const data = canvas.toDataURL('image/jpeg', quality);
                    if (!data || data.length < 32) return;

                    before += img.naturalWidth * img.naturalHeight;
                    after += targetW * targetH;
                    count++;

                    img.src = data;
                    // The crop is baked in now — let it fill the box exactly.
                    if (cover) img.style.objectFit = 'fill';
                    if (img.decode) await img.decode().catch(() => {});
                } catch (e) { /* keep the original image */ }
            }));

            return { before, after, count };
        }, PDF_PRINT_DPI_FACTOR, PDF_IMAGE_QUALITY);

        if (stats && stats.count) {
            console.log(`PDF: ${stats.count} image(s) downscaled, ` +
                `${(stats.before / 1e6).toFixed(1)}MP -> ${(stats.after / 1e6).toFixed(1)}MP`);
        }
    } catch (e) {
        console.warn('PDF image downscale skipped:', e.message);
    }
}

function extractCookie(header, name) {
    if (!header) return null;
    const part = String(header).split(';').map(x => x.trim()).find(x => x.startsWith(name + '='));
    return part ? part.slice(name.length + 1) : null;
}

// ---------------------------------------------------------------------------
// Eszamanlilik siniri
// ---------------------------------------------------------------------------
// Bir PDF ~8 saniye suruyor ve her biri ayri bir Chromium sekmesi aciyor. Tek
// kullaniciyken sorun degildi; cok kullanicida ayni anda gelen istekler sekme
// sekme bellek yiyor ve bu VPS'te baska projeler de calisiyor. Ayni anda en
// fazla PDF_CONCURRENCY tane render calisir, digerleri sirada bekler.
//
// Sira sonsuz degil: cok uzun beklemektense kullaniciya durumu soylemek daha
// dogru, aksi halde istek proxy zaman asimina takilip sessizce olurdu.
const PDF_CONCURRENCY = Number(process.env.PDF_CONCURRENCY) || 2;
const PDF_QUEUE_MAX = Number(process.env.PDF_QUEUE_MAX) || 12;

let active = 0;
const waiting = [];

function acquireSlot() {
    if (active < PDF_CONCURRENCY) {
        active++;
        return Promise.resolve();
    }
    if (waiting.length >= PDF_QUEUE_MAX) {
        const err = new Error('PDF sirasi dolu');
        err.code = 'PDF_BUSY';
        return Promise.reject(err);
    }
    return new Promise(resolve => waiting.push(resolve));
}

function releaseSlot() {
    const next = waiting.shift();
    if (next) next();          // slot devrediliyor, active ayni kaliyor
    else active--;
}

async function renderPdf(bodyHtml, origin, cookieHeader) {
    await acquireSlot();
    try {
        return await renderPdfUnthrottled(bodyHtml, origin, cookieHeader);
    } finally {
        releaseSlot();
    }
}

async function renderPdfUnthrottled(bodyHtml, origin, cookieHeader) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        // The site sits behind the password gate, so Chromium's requests for the
        // proposal's images and style.css would come back 401 and the PDF would
        // render as unstyled text with no photos. Two things are needed:
        //
        //  1. the same signed gate cookie the browser gets after login, and
        //  2. a document that actually lives on `origin`. setContent() alone runs
        //     on about:blank, which makes every asset request cross-site, so the
        //     SameSite=Lax gate cookie is withheld and the responses come back
        //     401 (Chromium then reports ERR_BLOCKED_BY_ORB). Navigating to a
        //     cheap same-origin URL first fixes the document origin; setContent
        //     afterwards keeps it.
        try {
            const cookies = [{ name: gate.COOKIE_NAME, value: gate.TOKEN, url: origin, path: '/' }];

            // Kullanicinin kendi oturum cerezi de gerekiyor: teklife eklenen
            // yapay zeka gorselleri /uploads altinda duruyor ve orasi girise
            // bagli (baska bir isletmenin gorselleri URL'i bilen herkese acik
            // olmasin diye). Bu cerez olmadan o gorseller PDF'te kaybolurdu.
            const sessionValue = extractCookie(cookieHeader, 'session');
            if (sessionValue) {
                cookies.push({ name: 'session', value: sessionValue, url: origin, path: '/' });
            }

            await page.setCookie(...cookies);
            await page.goto(origin + '/api/health', {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });
        } catch (e) {
            // Not fatal: the PDF still renders, just without gated assets.
            console.warn('PDF gate bypass failed, assets may be missing:', e.message);
        }

        // Apply the @media print rules and render backgrounds/colors.
        await page.emulateMediaType('print');
        await page.setContent(buildDocument(bodyHtml, origin), {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        await downscaleImages(page);

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });
        // Puppeteer v23 returns a Uint8Array; wrap so res.send / nodemailer treat it as binary.
        return Buffer.from(pdf);
    } finally {
        await page.close();
    }
}

// Simple in-memory IP rate limiter (PDF rendering is expensive).
function rateLimiter({ windowMs, max }) {
    const hits = new Map();
    return (req, res, next) => {
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        const now = Date.now();
        const recent = (hits.get(ip) || []).filter(t => now - t < windowMs);
        if (recent.length >= max) {
            const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({ message: 'Çok fazla istek. Lütfen biraz sonra tekrar deneyin.', retryAfter });
        }
        recent.push(now);
        hits.set(ip, recent);
        next();
    };
}
// IP bazli limiter kullanici bazli kotaya birakildi: ayni ofisten giren iki
// isletme birbirinin limitini yiyordu, tersine bir kullanici IP degistirerek
// limiti asabiliyordu. rateLimiter yine de duruyor cunku PDF uretimi pahali ve
// tek kullanicinin ard arda istek yagdirmasini kisa vadede de kesmek gerekiyor.
const pdfLimiter = rateLimiter({ windowMs: 10 * 60 * 1000, max: 20 });

router.use(requireAuth);

function getOrigin(req) {
    return process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get('host')}`;
}

function sanitizeFileName(name) {
    return (name || 'teklif')
        .toString()
        .replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ _.-]/g, '')
        .trim()
        .slice(0, 80) || 'teklif';
}

// POST /api/pdf/preview -> returns the PDF inline (download / preview).
router.post('/preview', pdfLimiter, quota.enforce('pdf'), async (req, res) => {
    try {
        const { html, fileName } = req.body;
        if (!html) return res.status(400).json({ message: 'Teklif içeriği (html) gerekli' });

        const pdf = await renderPdf(html, getOrigin(req), req.headers.cookie);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${sanitizeFileName(fileName)}.pdf"`
        });
        res.send(pdf);
    } catch (err) {
        if (err.code === 'PDF_BUSY') {
            return res.status(503).json({ message: 'Sistem su anda yogun, PDF sirasi dolu. Lutfen birkac saniye sonra tekrar deneyin.' });
        }
        console.error('PDF preview error:', err);
        res.status(500).json({ message: 'PDF oluşturulamadı: ' + err.message });
    }
});

// POST /api/pdf/send -> render the PDF and email it to the customer as attachment.
router.post('/send', pdfLimiter, quota.enforce('email'), async (req, res) => {
    try {
        const { html, customerEmail, customerName, projectName, message, fileName, senderName } = req.body;
        if (!html) return res.status(400).json({ message: 'Teklif içeriği (html) gerekli' });
        if (!customerEmail) return res.status(400).json({ message: 'Müşteri e-posta adresi gerekli' });

        // Dogrulanmamis hesaplar disariya e-posta gonderemez. Kotuye kullanimin
        // gercek zarari burada: baskasinin adresiyle acilan bir hesap, bizim
        // alan adimizdan istedigine mail atabilirdi ve itibar bize yazilirdi.
        if (!req.user.email_verified) {
            return res.status(403).json({
                message: 'E-posta gonderebilmek icin once kendi adresinizi dogrulamaniz gerekiyor. Kayit sirasinda gonderdigimiz dogrulama baglantisina tiklayin.',
                needsVerification: true
            });
        }
        if (!isMailConfigured()) {
            return res.status(503).json({ message: 'E-posta gönderimi yapılandırılmamış. .env içine SMTP_USER ve SMTP_PASS ekleyin.' });
        }

        const pdf = await renderPdf(html, getOrigin(req), req.headers.cookie);
        await sendProposalEmail({
            to: customerEmail,
            customerName,
            projectName,
            message,
            pdfBuffer: pdf,
            fileName: `${sanitizeFileName(fileName)}.pdf`,
            // Gonderen kimligi oturumdan geliyor; istemcinin yolladigi senderName
            // yalnizca firma adi icin bir tercih, cevap adresi degil.
            senderName: senderName || req.user.company_name || undefined,
            replyTo: req.user.email
        });

        res.json({ message: `Teklif PDF olarak ${customerEmail} adresine gönderildi.` });
    } catch (err) {
        if (err.code === 'PDF_BUSY') {
            return res.status(503).json({ message: 'Sistem su anda yogun. Lutfen birkac saniye sonra tekrar deneyin.' });
        }
        console.error('PDF send error:', err);
        res.status(500).json({ message: 'Gönderilemedi: ' + err.message });
    }
});

module.exports = router;
