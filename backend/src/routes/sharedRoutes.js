const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Публичный доступ (БЕЗ authenticateToken)
router.get('/exercises/:shareId', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM exercises WHERE share_id = $1', [req.params.shareId]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Не найдено' });
        res.json({ success: true, data: result.rows[0] });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/templates/:shareId', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM templates WHERE share_id = $1', [req.params.shareId]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Не найдено' });
        
        const tpl = result.rows[0];
        const exRes = await pool.query(`
            SELECT e.*, te.id as te_id, te.sort_order, te.superset_id 
            FROM exercises e JOIN template_exercises te ON e.id = te.exercise_id 
            WHERE te.template_id = $1 ORDER BY te.sort_order
        `, [tpl.id]);
        tpl.exercises = exRes.rows;
        
        for (let ex of tpl.exercises) {
            const setRes = await pool.query('SELECT * FROM template_sets WHERE template_exercise_id = $1 ORDER BY set_order', [ex.te_id]);
            ex.sets = setRes.rows;
        }
        
        res.json({ success: true, data: tpl });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;