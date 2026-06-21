const express = require('express');
const router = express.Router();
const db = require('../db_scripts/init');
const auth = require('./middleware');
const fs = require('fs');
const path = require('path');

// Load service packs
const packsPath = path.join(__dirname, '..', 'services', 'service-packs.json');
let servicePacks = { packs: [] };
try {
    if (fs.existsSync(packsPath)) {
        let rawData = fs.readFileSync(packsPath, 'utf8');
        // Remove BOM if present
        if (rawData.charCodeAt(0) === 0xFEFF) {
            rawData = rawData.slice(1);
        }
        servicePacks = JSON.parse(rawData);
        console.log('Service packs loaded:', servicePacks.packs.length, 'packs');
    } else {
        console.warn('Service packs file not found at:', packsPath);
    }
} catch (err) {
    console.error('Service packs error:', err.message);
}

// Get all services for user
router.get('/', auth, (req, res) => {
    const services = db.prepare('SELECT * FROM services WHERE user_id = ?').all(req.userId);
    res.json(services);
});

// Get available service packs (public)
router.get('/packs', (req, res) => {
    const packList = servicePacks.packs.map(p => ({
        id: p.id,
        name: p.name,
        icon: p.icon,
        description: p.description,
        serviceCount: p.services.length
    }));
    res.json(packList);
});

// Get a specific pack's services (public preview)
router.get('/packs/:packId', (req, res) => {
    const pack = servicePacks.packs.find(p => p.id === req.params.packId);
    if (!pack) return res.status(404).json({ message: 'Paket bulunamadı' });
    res.json(pack);
});

// Apply a service pack to user's account
router.post('/pack/:packId', auth, (req, res) => {
    const pack = servicePacks.packs.find(p => p.id === req.params.packId);
    if (!pack) return res.status(404).json({ message: 'Paket bulunamadı' });

    const stmt = db.prepare('INSERT INTO services (user_id, name, price, unit, description, conditions, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)');
    let added = 0;

    for (const srv of pack.services) {
        try {
            stmt.run(
                req.userId,
                srv.name,
                srv.price,
                srv.unit || 'Adet',
                srv.description || '',
                srv.conditions || '',
                srv.image_url || null
            );
            added++;
        } catch (err) {
            console.error('Service insert error:', err);
        }
    }

    res.status(201).json({ message: `${added} hizmet başarıyla eklendi`, added });
});

// Bulk import services from array
router.post('/bulk', auth, (req, res) => {
    const { services } = req.body;

    if (!Array.isArray(services) || services.length === 0) {
        return res.status(400).json({ message: 'Geçerli bir hizmet listesi gönderin' });
    }

    const stmt = db.prepare('INSERT INTO services (user_id, name, price, unit, description, conditions, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)');
    let added = 0;
    let errors = [];

    for (const srv of services) {
        if (!srv.name || srv.name.trim() === '') {
            errors.push(`Geçersiz hizmet adı: ${JSON.stringify(srv)}`);
            continue;
        }

        try {
            stmt.run(
                req.userId,
                srv.name.trim(),
                parseFloat(srv.price) || 0,
                srv.unit || 'Adet',
                srv.description || '',
                srv.conditions || '',
                srv.image_url || null
            );
            added++;
        } catch (err) {
            errors.push(`Hata: ${srv.name} - ${err.message}`);
        }
    }

    res.status(201).json({
        message: `${added} hizmet eklendi`,
        added,
        errors: errors.length > 0 ? errors : undefined
    });
});

// Add single service
router.post('/', auth, (req, res) => {
    const { name, price, unit, description, conditions, image_url } = req.body;

    // Validation
    if (!name || name.trim() === '') return res.status(400).json({ message: 'Hizmet adı boş olamaz' });
    if (isNaN(price) || price < 0) return res.status(400).json({ message: 'Geçersiz fiyat' });

    const stmt = db.prepare('INSERT INTO services (user_id, name, price, unit, description, conditions, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(req.userId, name, price, unit || 'Adet', description || '', conditions || '', image_url || null);
    res.status(201).json({ id: info.lastInsertRowid, name, price, unit, description, conditions, image_url });
});

// Update service
router.put('/:id', auth, (req, res) => {
    const { name, price, unit, description, conditions, image_url } = req.body;
    const { id } = req.params;

    // Validation
    if (!name || name.trim() === '') return res.status(400).json({ message: 'Hizmet adı boş olamaz' });
    if (isNaN(price) || price < 0) return res.status(400).json({ message: 'Geçersiz fiyat' });

    const stmt = db.prepare('UPDATE services SET name = ?, price = ?, unit = ?, description = ?, conditions = ?, image_url = ? WHERE id = ? AND user_id = ?');
    const info = stmt.run(name, price, unit || 'Adet', description || '', conditions || '', image_url || null, id, req.userId);

    if (info.changes === 0) return res.status(404).json({ message: 'Hizmet bulunamadı' });
    res.json({ id: parseInt(id), name, price, unit, description, conditions, image_url });
});

// Delete service
router.delete('/:id', auth, (req, res) => {
    const stmt = db.prepare('DELETE FROM services WHERE id = ? AND user_id = ?');
    const info = stmt.run(req.params.id, req.userId);
    if (info.changes === 0) return res.status(404).json({ message: 'Service not found' });
    res.json({ message: 'Service deleted' });
});

// Delete all services for user (for re-importing)
router.delete('/all/clear', auth, (req, res) => {
    const stmt = db.prepare('DELETE FROM services WHERE user_id = ?');
    const info = stmt.run(req.userId);
    res.json({ message: `${info.changes} hizmet silindi`, deleted: info.changes });
});

module.exports = router;

