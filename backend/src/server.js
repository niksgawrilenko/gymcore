// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool, initDB } = require('./db');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. КОНТРОЛЛЕР УПРАЖНЕНИЙ (ExerciseController)
// ==========================================
class ExerciseController {
    getAll = async (req, res) => {
        try {
            const dbRes = await pool.query('SELECT * FROM exercises ORDER BY name ASC');
            res.json({ success: true, data: dbRes.rows });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    getById = async (req, res) => {
        try {
            const dbRes = await pool.query('SELECT * FROM exercises WHERE id = $1', [req.params.id]);
            if (dbRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Не найдено' });
            res.json({ success: true, data: dbRes.rows[0] });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    create = async (req, res) => {
        try {
            const { name, category, exercise_type } = req.body;
            const dbRes = await pool.query(
                'INSERT INTO exercises (name, category, exercise_type) VALUES ($1, $2, $3) RETURNING *',
                [name, category, exercise_type]
            );
            res.json({ success: true, data: dbRes.rows[0] });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    update = async (req, res) => {
        try {
            const { name, category, exercise_type } = req.body;
            const dbRes = await pool.query(
                'UPDATE exercises SET name = $1, category = $2, exercise_type = $3 WHERE id = $4 RETURNING *',
                [name, category, exercise_type, req.params.id]
            );
            res.json({ success: true, data: dbRes.rows[0] });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    delete = async (req, res) => {
        try {
            await pool.query('DELETE FROM exercises WHERE id = $1', [req.params.id]);
            res.json({ success: true, message: 'Упражнение удалено' });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }
}

// ==========================================
// 2. КОНТРОЛЛЕР ШАБЛОНОВ (TemplateController)
// ==========================================
class TemplateController {
    getAll = async (req, res) => {
        try {
            const dbRes = await pool.query('SELECT * FROM templates ORDER BY id ASC');
            res.json({ success: true, data: dbRes.rows });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    getById = async (req, res) => {
        try {
            const tplRes = await pool.query('SELECT * FROM templates WHERE id = $1', [req.params.id]);
            if (tplRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Шаблон не найден' });
            
            const template = tplRes.rows[0];
            const exRes = await pool.query(`
                SELECT e.id, e.name, e.category, e.exercise_type, te.sort_order 
                FROM template_exercises te
                JOIN exercises e ON te.exercise_id = e.id
                WHERE te.template_id = $1
                ORDER BY te.sort_order ASC
            `, [template.id]);
            
            template.exercises = exRes.rows;
            res.json({ success: true, data: template });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    create = async (req, res) => {
        const { name, description, exercises } = req.body;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const tplRes = await client.query(
                'INSERT INTO templates (name, description) VALUES ($1, $2) RETURNING id',
                [name || 'Новый шаблон', description || 'Создано пользователем']
            );
            const templateId = tplRes.rows[0].id;

            if (exercises && exercises.length > 0) {
                for (let i = 0; i < exercises.length; i++) {
                    await client.query(
                        'INSERT INTO template_exercises (template_id, exercise_id, sort_order) VALUES ($1, $2, $3)',
                        [templateId, exercises[i].id, i]
                    );
                }
            }
            await client.query('COMMIT');
            res.json({ success: true, templateId });
        } catch (e) {
            await client.query('ROLLBACK');
            res.status(500).json({ success: false, error: e.message });
        } finally { client.release(); }
    }

    update = async (req, res) => {
        const { name, description, exercises } = req.body;
        const { id } = req.params;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE templates SET name = $1, description = $2 WHERE id = $3', [name, description, id]);
            
            if (exercises) {
                await client.query('DELETE FROM template_exercises WHERE template_id = $1', [id]);
                for (let i = 0; i < exercises.length; i++) {
                    await client.query(
                        'INSERT INTO template_exercises (template_id, exercise_id, sort_order) VALUES ($1, $2, $3)',
                        [id, exercises[i].id, i]
                    );
                }
            }
            await client.query('COMMIT');
            res.json({ success: true });
        } catch (e) {
            await client.query('ROLLBACK');
            res.status(500).json({ success: false, error: e.message });
        } finally { client.release(); }
    }

    delete = async (req, res) => {
        try {
            await pool.query('DELETE FROM templates WHERE id = $1', [req.params.id]);
            res.json({ success: true, message: 'Шаблон удален' });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }
}

// ==========================================
// 3. КОНТРОЛЛЕР ТРЕНИРОВОК (WorkoutController)
// ==========================================
class WorkoutController {
    getAll = async (req, res) => {
        try {
            const dbRes = await pool.query('SELECT id, title, workout_date FROM workouts ORDER BY workout_date DESC LIMIT 50');
            res.json({ success: true, data: dbRes.rows });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    getById = async (req, res) => {
        try {
            const workoutRes = await pool.query('SELECT * FROM workouts WHERE id = $1', [req.params.id]);
            if (workoutRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Не найдено' });
            
            const workout = workoutRes.rows[0];
            const exercisesRes = await pool.query(`
                SELECT e.id, we.id as workout_exercise_id, e.name, e.exercise_type, we.superset_id
                FROM workout_exercises we
                JOIN exercises e ON we.exercise_id = e.id
                WHERE we.workout_id = $1
                ORDER BY we.sort_order ASC
            `, [workout.id]);

            workout.exercises = exercisesRes.rows;
            for (let ex of workout.exercises) {
                const setsRes = await pool.query(`
                    SELECT weight, reps, duration_sec, distance_m, set_order
                    FROM sets WHERE workout_exercise_id = $1 ORDER BY set_order ASC
                `, [ex.workout_exercise_id]);
                ex.sets = setsRes.rows;
            }
            res.json({ success: true, data: workout });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    create = async (req, res) => {
        const { title, template_id, exercises, workout_date } = req.body;
        const client = await pool.connect(); 
        try {
            await client.query('BEGIN');
            const workoutRes = await client.query(
                'INSERT INTO workouts (title, template_id, workout_date) VALUES ($1, $2, $3) RETURNING id',
                [title || 'Новая тренировка', template_id || null, workout_date || new Date()]
            );
            const workoutId = workoutRes.rows[0].id;

            for (let i = 0; i < exercises.length; i++) {
                const ex = exercises[i];
                const weRes = await client.query(
                    'INSERT INTO workout_exercises (workout_id, exercise_id, sort_order, superset_id) VALUES ($1, $2, $3, $4) RETURNING id',
                    [workoutId, ex.id, i, ex.superset_id || null]
                );
                
                for (let j = 0; j < ex.sets.length; j++) {
                    const set = ex.sets[j];
                    const hasWeight = set.weight !== "" && set.weight !== null;
                    const hasReps = set.reps !== "" && set.reps !== null;
                    if (!hasWeight && !hasReps) continue;

                    const isCardio = ex.exercise_type === 'cardio';
                    await client.query(
                        `INSERT INTO sets (workout_exercise_id, set_order, weight, reps, duration_sec, distance_m, completed) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [
                            weRes.rows[0].id, j, 
                            isCardio ? null : (parseFloat(set.weight) || 0),
                            isCardio ? null : (parseInt(set.reps) || 0),
                            isCardio ? (parseInt(set.weight) || 0) : null,
                            isCardio ? (parseInt(set.reps) || 0) : null,
                            true
                        ]
                    );
                }
            }
            await client.query('COMMIT');
            res.json({ success: true, workoutId });
        } catch (e) {
            await client.query('ROLLBACK');
            res.status(500).json({ success: false, error: e.message });
        } finally { client.release(); }
    }

    update = async (req, res) => {
        const { id } = req.params;
        const { title, workout_date, exercises } = req.body;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE workouts SET title = $1, workout_date = $2 WHERE id = $3', [title, workout_date, id]);

            if (exercises) {
                await client.query('DELETE FROM workout_exercises WHERE workout_id = $1', [id]);
                for (let i = 0; i < exercises.length; i++) {
                    const ex = exercises[i];
                    const weRes = await client.query(
                        'INSERT INTO workout_exercises (workout_id, exercise_id, sort_order, superset_id) VALUES ($1, $2, $3, $4) RETURNING id',
                        [id, ex.id, i, ex.superset_id || null]
                    );
                    
                    for (let j = 0; j < ex.sets.length; j++) {
                        const set = ex.sets[j];
                        if ((set.weight === "" || set.weight === null) && (set.reps === "" || set.reps === null)) continue;
                        const isCardio = ex.exercise_type === 'cardio';
                        const val1 = set.weight ?? set.duration_sec ?? 0;
                        const val2 = set.reps ?? set.distance_m ?? 0;

                        await client.query(
                            `INSERT INTO sets (workout_exercise_id, set_order, weight, reps, duration_sec, distance_m, completed) 
                             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                            [
                                weRes.rows[0].id, j, 
                                isCardio ? null : (parseFloat(val1) || 0),
                                isCardio ? null : (parseInt(val2) || 0),
                                isCardio ? (parseInt(val1) || 0) : null,
                                isCardio ? (parseInt(val2) || 0) : null,
                                true
                            ]
                        );
                    }
                }
            }
            await client.query('COMMIT');
            res.json({ success: true });
        } catch (e) {
            await client.query('ROLLBACK');
            res.status(500).json({ success: false, error: e.message });
        } finally { client.release(); }
    }

    delete = async (req, res) => {
        try {
            await pool.query('DELETE FROM workouts WHERE id = $1', [req.params.id]);
            res.json({ success: true, message: 'Тренировка удалена' });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }
}

// ==========================================
// 4. МАРШРУТИЗАЦИЯ (Router Setup)
// ==========================================
const exercises = new ExerciseController();
app.get('/api/exercises', exercises.getAll);
app.get('/api/exercises/:id', exercises.getById);
app.post('/api/exercises', exercises.create);
app.patch('/api/exercises/:id', exercises.update);
app.delete('/api/exercises/:id', exercises.delete);

const templates = new TemplateController();
app.get('/api/templates', templates.getAll);
app.get('/api/templates/:id', templates.getById);
app.post('/api/templates', templates.create);
app.patch('/api/templates/:id', templates.update);
app.delete('/api/templates/:id', templates.delete);

const workouts = new WorkoutController();
app.get('/api/workouts', workouts.getAll);
app.get('/api/workouts/:id', workouts.getById);
app.post('/api/workouts', workouts.create);
app.patch('/api/workouts/:id', workouts.update);
app.delete('/api/workouts/:id', workouts.delete);

// Статус сервера
app.get('/api/status', async (req, res) => {
    try {
        const dbRes = await pool.query('SELECT NOW() as db_time');
        res.json({ success: true, databaseTime: dbRes.rows[0].db_time });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Запуск сервера
initDB().then(() => { 
    app.listen(port, () => console.log(`🚀 Сервер запущен на порту ${port}. Архитектура MVC активна.`)); 
});