const { pool } = require('../config/db');

class WorkoutController {
    getAll = async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT w.*, t.name as template_name 
                FROM workouts w 
                LEFT JOIN templates t ON w.template_id = t.id 
                WHERE w.user_id = $1
                ORDER BY w.workout_date DESC
            `, [req.user.id]);
            res.json({ success: true, data: result.rows });
        } catch (e) { res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' }); }
    }

    getById = async (req, res) => {
        try {
            const wRes = await pool.query('SELECT * FROM workouts WHERE id = $1', [req.params.id]);
            if (wRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Тренировка не найдена' });
            
            const workout = wRes.rows[0];

            const exRes = await pool.query(`
                SELECT we.id as we_id, we.superset_id, we.sort_order, e.*
                FROM workout_exercises we
                JOIN exercises e ON we.exercise_id = e.id
                WHERE we.workout_id = $1 
                ORDER BY we.sort_order
            `, [workout.id]);

            workout.exercises = exRes.rows;

            for (let ex of workout.exercises) {
                const setRes = await pool.query('SELECT * FROM sets WHERE workout_exercise_id = $1 ORDER BY set_order', [ex.we_id]);
                ex.sets = setRes.rows;
            }

            res.json({ success: true, data: workout });
        } catch (e) { res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' }); }
    }

    create = async (req, res) => {
        const client = await pool.connect(); // Выделенный коннект для транзакции
        try {
            await client.query('BEGIN'); // Старт транзакции
            
            // ДОБАВЛЕНО: Достаем media из тела запроса
            const { title, template_id, workout_date, exercises, media } = req.body;
            
            // ДОБАВЛЕНО: Добавили колонку media и параметр $5
            const wRes = await client.query(
                'INSERT INTO workouts (title, template_id, workout_date, user_id, media) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [title, template_id || null, workout_date || new Date(), req.user.id, JSON.stringify(media || [])]
            );
            const workoutId = wRes.rows[0].id;

            if (exercises && exercises.length > 0) {
                for (let i = 0; i < exercises.length; i++) {
                    const ex = exercises[i];
                    const weRes = await client.query(
                        'INSERT INTO workout_exercises (workout_id, exercise_id, superset_id, sort_order) VALUES ($1, $2, $3, $4) RETURNING id',
                        [workoutId, ex.id, ex.superset_id || null, i]
                    );
                    const weId = weRes.rows[0].id;

                    if (ex.sets && ex.sets.length > 0) {
                        for (let j = 0; j < ex.sets.length; j++) {
                            const set = ex.sets[j];
                            await client.query(
                                'INSERT INTO sets (workout_exercise_id, set_order, weight, reps, duration_sec, distance_m, completed) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                                [weId, j, set.weight || null, set.reps || null, set.duration_sec || null, set.distance_m || null, set.completed || false]
                            );
                        }
                    }
                }
            }
            await client.query('COMMIT'); // Всё успешно -> сохраняем
            res.json({ success: true, data: wRes.rows[0] });
        } catch (e) {
            await client.query('ROLLBACK'); // Ошибка -> откатываем всё
            console.error('[Workout Create Error]:', e.message);
            res.status(500).json({ success: false, error: 'Ошибка при сохранении тренировки' });
        } finally {
            client.release(); // Обязательно возвращаем коннект
        }
    }

    update = async (req, res) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // ДОБАВЛЕНО: Достаем media из тела запроса
            const { title, workout_date, exercises, media } = req.body;
            const workoutId = req.params.id;

            // ДОБАВЛЕНО: Обновляем колонку media и передаем параметр $3 (а id и user_id сдвинулись на $4 и $5)
            const wRes = await client.query(
                'UPDATE workouts SET title = $1, workout_date = $2, media = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
                [title, workout_date || new Date(), JSON.stringify(media || []), workoutId, req.user.id]
            );

            if (wRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(403).json({ success: false, error: 'Нет прав или не найдено' });
            }

            await client.query('DELETE FROM workout_exercises WHERE workout_id = $1', [workoutId]);

            if (exercises && exercises.length > 0) {
                for (let i = 0; i < exercises.length; i++) {
                    const ex = exercises[i];
                    const weRes = await client.query(
                        'INSERT INTO workout_exercises (workout_id, exercise_id, superset_id, sort_order) VALUES ($1, $2, $3, $4) RETURNING id',
                        [workoutId, ex.id, ex.superset_id || null, i]
                    );
                    const weId = weRes.rows[0].id;

                    if (ex.sets && ex.sets.length > 0) {
                        for (let j = 0; j < ex.sets.length; j++) {
                            const set = ex.sets[j];
                            await client.query(
                                'INSERT INTO sets (workout_exercise_id, set_order, weight, reps, duration_sec, distance_m, completed) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                                [weId, j, set.weight || null, set.reps || null, set.duration_sec || null, set.distance_m || null, set.completed || false]
                            );
                        }
                    }
                }
            }
            await client.query('COMMIT');
            res.json({ success: true, data: wRes.rows[0] });
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('[Workout Update Error]:', e.message);
            res.status(500).json({ success: false, error: 'Ошибка при обновлении тренировки' });
        } finally {
            client.release();
        }
    }

    delete = async (req, res) => {
        try {
            const result = await pool.query('DELETE FROM workouts WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
            if (result.rows.length === 0) return res.status(403).json({ success: false, error: 'Нет прав' });
            res.json({ success: true, message: 'Удалено' });
        } catch (e) { res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' }); }
    }
}

module.exports = new WorkoutController();