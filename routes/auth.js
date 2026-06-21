const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const db = require('../db_scripts/init');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required. Set it in your .env file.');
}

// Register
router.post('/register', async (req, res) => {
    const { email, password, companyName, industryId } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        console.log('Registering user:', email);
        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed. Inserting into DB...');
        const stmt = db.prepare('INSERT INTO users (email, password, company_name, industry_id) VALUES (?, ?, ?, ?)');
        const info = stmt.run(email, hashedPassword, companyName, industryId);
        const userId = info.lastInsertRowid;
        console.log('User created with ID:', userId);

        // Auto-load industry pack if requested
        if (industryId) {
            loadIndustryPack(userId, industryId);
        }

        const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, userId, companyName });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ message: 'Email already exists' });
        }
        res.status(500).json({ message: 'Registration failed', error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
        console.log('User not found:', email);
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('Comparing passwords...');
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);
    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: user.id, companyName: user.company_name });
});

function loadIndustryPack(userId, industryId) {
    const packsPath = path.join(__dirname, '..', 'services', 'service-packs.json');
    try {
        if (!fs.existsSync(packsPath)) return console.warn('Packs file not found during register');

        let rawData = fs.readFileSync(packsPath, 'utf8');
        if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);
        const servicePacks = JSON.parse(rawData);

        const pack = servicePacks.packs.find(p => p.id === industryId);
        if (!pack) return console.warn(`Pack ${industryId} not found during register`);

        const stmt = db.prepare('INSERT INTO services (user_id, name, price, unit, description, conditions, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for (const s of pack.services) {
            stmt.run(
                userId,
                s.name,
                s.price || 0,
                s.unit || 'Adet',
                s.description || '',
                s.conditions || '',
                s.image_url || null
            );
        }
        console.log(`Auto-loaded ${pack.services.length} services for new user ${userId} and sector ${industryId}`);
    } catch (err) {
        console.error('Error auto-loading pack:', err.message);
    }
}

module.exports = router;
