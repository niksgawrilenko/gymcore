const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

router.use(authenticateToken, requireAdmin); // Двойная защита

router.get('/pending', async (req, res) => {
    try {
        const exercises = await pool.query("SELECT * FROM exercises WHERE moderation_status = 'pending'");
        const templates = await pool.query("SELECT * FROM templates WHERE moderation_status = 'pending'");
        res.json({ success: true, data: { exercises: exercises.rows, templates: templates.rows } });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/approve/:type/:id', async (req, res) => {
    const table = req.params.type === 'exercise' ? 'exercises' : 'templates';
    try {
        await pool.query(`UPDATE ${table} SET moderation_status = 'approved', is_public = true WHERE id = $1`, [req.params.id]);
        res.json({ success: true, message: 'Одобрено' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/reject/:type/:id', async (req, res) => {
    const table = req.params.type === 'exercise' ? 'exercises' : 'templates';
    try {
        await pool.query(`UPDATE ${table} SET moderation_status = 'rejected' WHERE id = $1`, [req.params.id]);
        res.json({ success: true, message: 'Отклонено' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;