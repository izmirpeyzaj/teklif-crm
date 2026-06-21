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
app.use(express.static(path.join(__dirname, 'public')));

let initError = null;

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'crm.izmirev.online API is running', 
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

    // Import and use routes
    const authRoutes = require('./routes/auth');
    const serviceRoutes = require('./routes/services');
    const proposalRoutes = require('./routes/proposals');
    const kanbanRoutes = require('./routes/kanban');
    const pdfRoutes = require('./routes/pdf');

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSy_PLACEHOLDER_KEY');
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Simple in-memory IP rate limiter for the public AI endpoints.
    // The current frontend has no auth flow (USE_API=false / localStorage), so these
    // routes are open. This caps abuse / accidental quota+cost drain without breaking them.
    function rateLimiter({ windowMs, max }) {
        const hits = new Map(); // ip -> [timestamps]
        return (req, res, next) => {
            const ip = req.ip || req.connection?.remoteAddress || 'unknown';
            const now = Date.now();
            const recent = (hits.get(ip) || []).filter(t => now - t < windowMs);
            if (recent.length >= max) {
                const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
                res.set('Retry-After', String(retryAfter));
                return res.status(429).json({ error: 'Çok fazla istek. Lütfen biraz sonra tekrar deneyin.', retryAfter });
            }
            recent.push(now);
            hits.set(ip, recent);
            next();
        };
    }

    const aiTextLimiter = rateLimiter({ windowMs: 10 * 60 * 1000, max: 30 }); // 30 / 10dk
    const aiImageLimiter = rateLimiter({ windowMs: 10 * 60 * 1000, max: 10 }); // 10 / 10dk (görsel pahalı)

    // AI Routes
    app.post('/api/ai/text', aiTextLimiter, async (req, res) => {
        try {
            const { prompt } = req.body;
            if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            res.json({ text });
        } catch (error) {
            console.error('AI Error:', error);
            res.status(500).json({ error: 'Failed to generate text', details: error.message });
        }
    });

    // AI Image Generation
    const imageModel = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp-image-generation",
        generationConfig: {
            responseModalities: ["TEXT", "IMAGE"]
        }
    });

    app.post('/api/ai/image', aiImageLimiter, async (req, res) => {
        try {
            const { serviceName } = req.body;
            if (!serviceName) return res.status(400).json({ error: 'serviceName is required' });

            const prompt = `Generate a professional, clean, high-quality photograph representing the service: "${serviceName}". The image should look like a real professional portfolio photo suitable for a business proposal document. No text or watermarks. Realistic style.`;

            const result = await imageModel.generateContent(prompt);
            const response = await result.response;
            const parts = response.candidates[0].content.parts;

            // Find the image part
            const imagePart = parts.find(p => p.inlineData);
            if (!imagePart) {
                return res.status(500).json({ error: 'No image generated' });
            }

            // Save image to public/uploads/ai/
            const uploadsDir = path.join(__dirname, 'public', 'uploads', 'ai');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const filename = `ai_${Date.now()}.png`;
            const filepath = path.join(uploadsDir, filename);
            const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
            fs.writeFileSync(filepath, buffer);

            const imageUrl = `/uploads/ai/${filename}`;
            console.log(`AI Image generated: ${imageUrl}`);
            res.json({ imageUrl, filename });
        } catch (error) {
            console.error('AI Image Error:', error);
            res.status(500).json({ error: 'Failed to generate image', details: error.message });
        }
    });

    app.use('/api/auth', authRoutes);
    app.use('/api/services', serviceRoutes);
    app.use('/api/proposals', proposalRoutes);
    app.use('/api/kanban', kanbanRoutes);
    app.use('/api/pdf', pdfRoutes);

} catch (err) {
    console.error("Initialization error:", err);
    initError = err.stack || err.toString();
    try {
        fs.appendFileSync('crash.log', `[${new Date().toISOString()}] Init Error:\n${initError}\n`);
    } catch(e) {}
}

app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
