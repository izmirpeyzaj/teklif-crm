const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const { sendProposalEmail, isMailConfigured } = require('../services/mail');

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

async function renderPdf(bodyHtml, origin) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        // Apply the @media print rules and render backgrounds/colors.
        await page.emulateMediaType('print');
        await page.setContent(buildDocument(bodyHtml, origin), {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
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
const pdfLimiter = rateLimiter({ windowMs: 10 * 60 * 1000, max: 20 });

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
router.post('/preview', pdfLimiter, async (req, res) => {
    try {
        const { html, fileName } = req.body;
        if (!html) return res.status(400).json({ message: 'Teklif içeriği (html) gerekli' });

        const pdf = await renderPdf(html, getOrigin(req));
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${sanitizeFileName(fileName)}.pdf"`
        });
        res.send(pdf);
    } catch (err) {
        console.error('PDF preview error:', err);
        res.status(500).json({ message: 'PDF oluşturulamadı: ' + err.message });
    }
});

// POST /api/pdf/send -> render the PDF and email it to the customer as attachment.
router.post('/send', pdfLimiter, async (req, res) => {
    try {
        const { html, customerEmail, customerName, projectName, message, fileName } = req.body;
        if (!html) return res.status(400).json({ message: 'Teklif içeriği (html) gerekli' });
        if (!customerEmail) return res.status(400).json({ message: 'Müşteri e-posta adresi gerekli' });
        if (!isMailConfigured()) {
            return res.status(503).json({ message: 'E-posta gönderimi yapılandırılmamış. .env içine SMTP_USER ve SMTP_PASS ekleyin.' });
        }

        const pdf = await renderPdf(html, getOrigin(req));
        await sendProposalEmail({
            to: customerEmail,
            customerName,
            projectName,
            message,
            pdfBuffer: pdf,
            fileName: `${sanitizeFileName(fileName)}.pdf`
        });

        res.json({ message: `Teklif PDF olarak ${customerEmail} adresine gönderildi.` });
    } catch (err) {
        console.error('PDF send error:', err);
        res.status(500).json({ message: 'Gönderilemedi: ' + err.message });
    }
});

module.exports = router;
