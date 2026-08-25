require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Larger limit: captured proposal HTML can embed a base64 logo / images.
app.use(express.json({ limit: '15mb' }));

// Kapali beta duvari (istege bagli).
// Tek isletmelik donemde bu, tum siteyi koruyan tek sifreydi. Artik gercek
// uyelik sistemi var; SITE_PASSWORD tanimliysa kapi kayit ekraninin ONUNDE
// durur ve site herkese acilmaz. Herkese acmak icin degiskeni kaldirmak yeterli.
if (process.env.SITE_PASSWORD) {
    console.log('Kapali beta modu: SITE_PASSWORD tanimli, site sifre kapisi arkasinda.');
    require('./gate')(app);
}

let initError = null;

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Teklif CRM API is running',
        initError: initError,
        env: process.env.NODE_ENV,
        nodeVersion: process.version
    });
});

app.get('/api/error', (req, res) => {
    if (initError) {
        res.type('text/plain').send(initError);
    } else {
        res.send('No initialization errors caught in try block');
    }
});

app.get('/api/crash', (req, res) => {
    try {
        if (fs.existsSync('crash.log')) {
            const crash = fs.readFileSync('crash.log', 'utf8');
            res.type('text/plain').send(crash);
        } else {
            res.send('No crash.log found');
        }
    } catch (e) {
        res.status(500).send("Error reading crash.log: " + e.message);
    }
});

// Start listening IMMEDIATELY to avoid 503 from proxy timeouts
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
    const errorMsg = `[${new Date().toISOString()}] Uncaught Exception:\n${err.stack || err}\n`;
    try {
        fs.appendFileSync('crash.log', errorMsg);
    } catch(e) {}
    console.error(errorMsg);
});

// Require DB and other things LATER
try {
    console.log("Starting heavy initialization...");
    const db = require('./db_scripts/init');
    const { GoogleGenerativeAI } = require('@google/generative-ai');

    const session = require('./services/session');
    const quota = require('./services/quota');

    // Import and use routes
    const authRoutes = require('./routes/auth');
    const pdfRoutes = require('./routes/pdf');
    const syncRoutes = require('./routes/sync');

    // Kullaniciya ait yuklemeler (AI gorselleri) statik klasorden ONCE korunur;
    // aksi halde URL'i bilen herkes baska bir isletmenin teklif gorsellerini
    // acabilirdi. Uygulamanin kendi varliklari (css, js, hazir gorseller) acik.
    app.use('/uploads', session.requireAuth, express.static(path.join(__dirname, 'public', 'uploads')));
    app.use(express.static(path.join(__dirname, 'public')));

    // Model adlari: gemini-2.0-* surumleri emekli edildi ve 404 donuyordu.
    // Guncel isimleri `GET /v1beta/models` listeler; degistirmeden once oradan dogrula.
    const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-3.7-flash';
    const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSy_PLACEHOLDER_KEY');
    const model = genAI.getGenerativeModel({ model: TEXT_MODEL });

    const imageModel = genAI.getGenerativeModel({
        model: IMAGE_MODEL,
        generationConfig: {
            responseModalities: ["TEXT", "IMAGE"]
        }
    });

    // AI uclari artik girise bagli ve kullanici basina gunluk kotali.
    // Her cagri bizim Gemini anahtarimizdan para harcadigi icin IP bazli limit
    // yetmiyordu: bir kullanici birden cok IP'den girebiliyor.
    app.post('/api/ai/text', session.requireAuth, quota.enforce('ai_text'), async (req, res) => {
        try {
            const { prompt } = req.body;
            if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            res.json({ text: response.text() });
        } catch (error) {
            console.error('AI Error:', error);
            res.status(500).json({ error: 'Failed to generate text', details: error.message });
        }
    });

    app.post('/api/ai/image', session.requireAuth, quota.enforce('ai_image'), async (req, res) => {
        try {
            const { serviceName } = req.body;
            if (!serviceName) return res.status(400).json({ error: 'serviceName is required' });

            const prompt = `Generate a professional, clean, high-quality photograph representing the service: "${serviceName}". The image should look like a real professional portfolio photo suitable for a business proposal document. No text or watermarks. Realistic style.`;

            const result = await imageModel.generateContent(prompt);
            const response = await result.response;
            const parts = (response.candidates && response.candidates[0] && response.candidates[0].content.parts) || [];

            const imagePart = parts.find(p => p.inlineData);
            if (!imagePart) {
                return res.status(500).json({ error: 'No image generated' });
            }

            // Her kullanicinin gorselleri kendi klasorunde.
            const uploadsDir = path.join(__dirname, 'public', 'uploads', 'ai', String(req.user.id));
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const filename = `ai_${Date.now()}.png`;
            fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(imagePart.inlineData.data, 'base64'));

            const imageUrl = `/uploads/ai/${req.user.id}/${filename}`;
            console.log(`AI Image generated for user ${req.user.id}: ${imageUrl}`);
            res.json({ imageUrl, filename });
        } catch (error) {
            console.error('AI Image Error:', error);
            res.status(500).json({ error: 'Failed to generate image', details: error.message });
        }
    });

    // Kalan kotayi arayuzde gostermek icin.
    app.get('/api/usage', session.requireAuth, (req, res) => {
        res.json({ usage: quota.remaining(req.user.id) });
    });

    app.use('/api/auth', authRoutes);
    app.use('/api/pdf', pdfRoutes);
    app.use('/api/sync', syncRoutes);

    // NOT: routes/services.js, routes/proposals.js, routes/kanban.js olu kod.
    // Frontend'in tum verisi localStorage + /api/sync uzerinden akiyor; bu uclar
    // hicbir yerden cagrilmiyor. Ilerde ilisikisel yapiya (B yolu) gecilirse
    // temel olarak kullanilacaklar, o yuzden silinmediler ama baglanmadilar da.

} catch (err) {
    console.error("Initialization error:", err);
    initError = err.stack || err.toString();
    try {
        fs.appendFileSync('crash.log', `[${new Date().toISOString()}] Init Error:\n${initError}\n`);
    } catch(e) {}
}

// SPA yonlendirmesi: bilinmeyen YOL'lar icin index.html don.
//
// Ama dosya gibi gorunen (uzantili) istekler icin DONME. Aksi halde eksik bir
// gorsel 404 yerine 70KB'lik index.html ile 200 donuyordu: tarayici HTML'i
// gorsel olarak cozemeyip onerror'a dusuyor, yani yer tutucu yine calisiyordu
// ama her eksik gorsel icin bosuna 70KB indiriliyordu. Sektor paketlerinde
// henuz uretilmemis 98 gorsel var; tek teklifte 10 tanesi cikabiliyor.
//
// Ayrica: yanlis yazilmis her varlik adresi sessizce 200 donuyordu, bu da
// hatayi gizliyordu.
const VARLIK_UZANTISI = /\.[a-z0-9]{2,5}$/i;

app.use((req, res) => {
    if (VARLIK_UZANTISI.test(req.path)) {
        return res.status(404).type('text/plain').send('Bulunamadi');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
