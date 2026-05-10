// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool, initDB } = require('./db');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Маршруты статуса, упражнений и шаблонов оставляем как были...
app.get('/api/status', async (req, res) => {
    try {
        const dbResponse = await pool.query('SELECT NOW() as db_time');
        res.json({ success: true, databaseTime: dbResponse.rows[0].db_time });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/exercises', async (req, res) => {
    try {
        const dbResponse = await pool.query('SELECT * FROM exercises ORDER BY name ASC');
        res.json({ success: true, data: dbResponse.rows });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/workouts', async (req, res) => {
    try {
        const dbResponse = await pool.query('SELECT id, title, workout_date FROM workouts ORDER BY workout_date DESC LIMIT 50');
        res.json({ success: true, data: dbResponse.rows });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/templates', async (req, res) => {
    try {
        const dbResponse = await pool.query('SELECT * FROM templates ORDER BY id ASC');
        res.json({ success: true, data: dbResponse.rows });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/templates/:id', async (req, res) => {
    try {
        const templateId = req.params.id;
        const tplRes = await pool.query('SELECT * FROM templates WHERE id = $1', [templateId]);
        if (tplRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Шаблон не найден' });
        const template = tplRes.rows[0];
        const exRes = await pool.query(`
            SELECT e.id, e.name, e.category, e.exercise_type, te.sort_order 
            FROM template_exercises te
            JOIN exercises e ON te.exercise_id = e.id
            WHERE te.template_id = $1
            ORDER BY te.sort_order ASC
        `, [templateId]);
        template.exercises = exRes.rows;
        res.json({ success: true, data: template });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ... (начало файла без изменений)

// ПОЛУЧЕНИЕ ДЕТАЛЕЙ (ИСПРАВЛЕНО: добавлен e.id)
app.get('/api/workouts/:id', async (req, res) => {
    try {
        const workoutId = req.params.id;
        const workoutRes = await pool.query('SELECT * FROM workouts WHERE id = $1', [workoutId]);
        if (workoutRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Не найдено' });
        
        const workout = workoutRes.rows[0];
        const exercisesRes = await pool.query(`
            SELECT 
                e.id, 
                we.id as workout_exercise_id, 
                e.name, 
                e.exercise_type, 
                we.superset_id
            FROM workout_exercises we
            JOIN exercises e ON we.exercise_id = e.id
            WHERE we.workout_id = $1
            ORDER BY we.sort_order ASC
        `, [workoutId]);

        const exercises = exercisesRes.rows;
        for (let ex of exercises) {
            const setsRes = await pool.query(`
                SELECT weight, reps, duration_sec, distance_m, set_order
                FROM sets
                WHERE workout_exercise_id = $1
                ORDER BY set_order ASC
            `, [ex.workout_exercise_id]);
            ex.sets = setsRes.rows;
        }

        workout.exercises = exercises;
        res.json({ success: true, data: workout });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// МАРШРУТ PATCH (ФИНАЛЬНЫЙ СТАБИЛЬНЫЙ ВАРИАНТ)
app.patch('/api/workouts/:id', async (req, res) => {
    const { id } = req.params;
    const { title, workout_date, exercises } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(
            'UPDATE workouts SET title = $1, workout_date = $2 WHERE id = $3',
            [title, workout_date, id]
        );

        if (exercises) {
            await client.query('DELETE FROM workout_exercises WHERE workout_id = $1', [id]);

            for (let i = 0; i < exercises.length; i++) {
                const ex = exercises[i];
                // ex.id теперь будет приходить корректно из исправленного GET
                const weRes = await client.query(
                    'INSERT INTO workout_exercises (workout_id, exercise_id, sort_order, superset_id) VALUES ($1, $2, $3, $4) RETURNING id',
                    [id, ex.id, i, ex.superset_id || null]
                );
                const weId = weRes.rows[0].id;

                for (let j = 0; j < ex.sets.length; j++) {
                    const set = ex.sets[j];
                    
                    // Строгая проверка: если оба поля пустые, не сохраняем
                    if ((set.weight === "" || set.weight === null) && (set.reps === "" || set.reps === null)) continue;

                    const isCardio = ex.exercise_type === 'cardio';
                    
                    // Используем ?? чтобы 0 не превращался в null
                    const val1 = set.weight ?? set.duration_sec ?? 0;
                    const val2 = set.reps ?? set.distance_m ?? 0;

                    await client.query(
                        `INSERT INTO sets (workout_exercise_id, set_order, weight, reps, duration_sec, distance_m, completed) 
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [
                            weId, j, 
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
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('PATCH ERROR:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally { client.release(); }
});

// ... (остальной файл)
// 1. Маршрут для УДАЛЕНИЯ тренировки
app.delete('/api/workouts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM workouts WHERE id = $1', [id]);
        res.json({ success: true, message: 'Тренировка удалена' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// СОХРАНЕНИЕ (Полностью переделано под авто-сохранение всех данных)
app.post('/api/workouts', async (req, res) => {
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
            const weId = weRes.rows[0].id;

            // Сохраняем ВСЕ подходы, где введен хотя бы вес или повторы
            for (let j = 0; j < ex.sets.length; j++) {
                const set = ex.sets[j];
                
                // Проверяем: если оба поля пустые (строки или null), пропускаем
                const hasWeight = set.weight !== "" && set.weight !== null;
                const hasReps = set.reps !== "" && set.reps !== null;
                if (!hasWeight && !hasReps) continue;

                const isCardio = ex.exercise_type === 'cardio';

                await client.query(
                    `INSERT INTO sets (workout_exercise_id, set_order, weight, reps, duration_sec, distance_m, completed) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        weId, j, 
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
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: error.message });
    } finally { client.release(); }
});

initDB().then(() => { app.listen(port, () => console.log(`🚀 Сервер готов на порту ${port}`)); });