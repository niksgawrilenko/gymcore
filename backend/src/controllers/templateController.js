const { pool } = require('../config/db');

class TemplateController {
    getAll = async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT * FROM templates WHERE is_public = true OR user_id = $1 ORDER BY id DESC', 
                [req.user.id]
            );
            res.json({ success: true, data: result.rows });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    getById = async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT * FROM templates WHERE id = $1 AND (is_public = true OR user_id = $2)', 
                [req.params.id, req.user.id]
            );
            if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Шаблон не найден' });
            
            const tpl = result.rows[0];
            
            // Подтягиваем упражнения (Обрати внимание на te.id as te_id)
            const exRes = await pool.query(`
                SELECT e.*, te.id as te_id, te.sort_order, te.superset_id  
                FROM exercises e 
                JOIN template_exercises te ON e.id = te.exercise_id 
                WHERE te.template_id = $1 
                ORDER BY te.sort_order
            `, [tpl.id]);
            
            tpl.exercises = exRes.rows;

            // Подтягиваем подходы для каждого упражнения шаблона
            for (let ex of tpl.exercises) {
                const setRes = await pool.query('SELECT * FROM template_sets WHERE template_exercise_id = $1 ORDER BY set_order', [ex.te_id]);
                ex.sets = setRes.rows;
            }

            res.json({ success: true, data: tpl });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    create = async (req, res) => {
        try {
            const { name, description, exercises } = req.body;
            
            const tplRes = await pool.query(
                'INSERT INTO templates (name, description, user_id) VALUES ($1, $2, $3) RETURNING *',
                [name, description, req.user.id]
            );
            const templateId = tplRes.rows[0].id;

            if (exercises && exercises.length > 0) {
                for (let i = 0; i < exercises.length; i++) {
                    // Сохраняем упражнение и забираем его ID
                    const teRes = await pool.query(
                        'INSERT INTO template_exercises (template_id, exercise_id, sort_order, superset_id) VALUES ($1, $2, $3, $4) RETURNING id',
                        [templateId, exercises[i].id, i, exercises[i].superset_id || null]
                    );
                    const teId = teRes.rows[0].id;

                    // Сохраняем сеты для этого упражнения
                    if (exercises[i].sets && exercises[i].sets.length > 0) {
                        for (let j = 0; j < exercises[i].sets.length; j++) {
                            const set = exercises[i].sets[j];
                            await pool.query(
                                'INSERT INTO template_sets (template_exercise_id, set_order, weight, reps, duration_sec, distance_m) VALUES ($1, $2, $3, $4, $5, $6)',
                                [teId, j, set.weight || null, set.reps || null, set.duration_sec || null, set.distance_m || null]
                            );
                        }
                    }
                }
            }
            res.json({ success: true, data: tplRes.rows[0] });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    update = async (req, res) => {
        try {
            const { name, description, exercises } = req.body;
            const tplId = req.params.id;

            const tplRes = await pool.query(
                'UPDATE templates SET name = $1, description = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
                [name, description, tplId, req.user.id]
            );

            if (tplRes.rows.length === 0) return res.status(403).json({ success: false, error: 'Нет прав или шаблон не найден' });

            // Каскадное удаление старых упражнений (и их сетов)
            await pool.query('DELETE FROM template_exercises WHERE template_id = $1', [tplId]);
            
            if (exercises && exercises.length > 0) {
                for (let i = 0; i < exercises.length; i++) {
                    const teRes = await pool.query(
                        'INSERT INTO template_exercises (template_id, exercise_id, sort_order, superset_id) VALUES ($1, $2, $3, $4) RETURNING id',
                        [tplId, exercises[i].id, i, exercises[i].superset_id || null]
                    );
                    const teId = teRes.rows[0].id;

                    if (exercises[i].sets && exercises[i].sets.length > 0) {
                        for (let j = 0; j < exercises[i].sets.length; j++) {
                            const set = exercises[i].sets[j];
                            await pool.query(
                                'INSERT INTO template_sets (template_exercise_id, set_order, weight, reps, duration_sec, distance_m) VALUES ($1, $2, $3, $4, $5, $6)',
                                [teId, j, set.weight || null, set.reps || null, set.duration_sec || null, set.distance_m || null]
                            );
                        }
                    }
                }
            }
            res.json({ success: true, data: tplRes.rows[0] });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    delete = async (req, res) => {
        try {
            const result = await pool.query('DELETE FROM templates WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
            if (result.rows.length === 0) return res.status(403).json({ success: false, error: 'Нет прав' });
            res.json({ success: true, data: result.rows[0] });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    moderate = async (req, res) => {
        try {
            const result = await pool.query("UPDATE templates SET moderation_status = 'pending' WHERE id = $1 AND user_id = $2 RETURNING *", [req.params.id, req.user.id]);
            if (result.rows.length === 0) return res.status(403).json({ success: false, error: 'Нет доступа' });
            res.json({ success: true, data: result.rows[0] });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }
}

module.exports = new TemplateController();