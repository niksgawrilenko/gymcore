const { pool } = require('../config/db');

class ExerciseController {
    getAll = async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM exercises WHERE is_public = true OR user_id = $1 ORDER BY name', [req.user.id]);
            res.json({ success: true, data: result.rows });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    getById = async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM exercises WHERE id = $1 AND (is_public = true OR user_id = $2)', [req.params.id, req.user.id]);
            if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Не найдено' });
            res.json({ success: true, data: result.rows[0] });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    create = async (req, res) => {
        try {
            const { name, category, exercise_type, primary_groups, secondary_muscles } = req.body;
            const dbRes = await pool.query(
                `INSERT INTO exercises (name, category, exercise_type, user_id, primary_groups, secondary_muscles) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [name, category, exercise_type, req.user.id, primary_groups || [], secondary_muscles || []]
            );
            res.json({ success: true, data: dbRes.rows[0] });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    update = async (req, res) => {
        try {
            const { name, category, exercise_type, primary_groups, secondary_muscles } = req.body;
            const dbRes = await pool.query(
                `UPDATE exercises SET name = $1, category = $2, exercise_type = $3, primary_groups = $4, secondary_muscles = $5 
                 WHERE id = $6 AND user_id = $7 RETURNING *`,
                [name, category, exercise_type, primary_groups || [], secondary_muscles || [], req.params.id, req.user.id]
            );
            if (dbRes.rows.length === 0) return res.status(403).json({ success: false, error: 'Нет прав' });
            res.json({ success: true, data: dbRes.rows[0] });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    delete = async (req, res) => {
        try {
            const dbRes = await pool.query('DELETE FROM exercises WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
            if (dbRes.rows.length === 0) return res.status(403).json({ success: false, error: 'Нет прав' });
            res.json({ success: true, data: dbRes.rows[0] });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    moderate = async (req, res) => {
        try {
            const result = await pool.query("UPDATE exercises SET moderation_status = 'pending' WHERE id = $1 AND user_id = $2 RETURNING *", [req.params.id, req.user.id]);
            if (result.rows.length === 0) return res.status(403).json({ success: false, error: 'Нет доступа' });
            res.json({ success: true, data: result.rows[0] });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }
}
module.exports = new ExerciseController();