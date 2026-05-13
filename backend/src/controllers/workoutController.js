const { pool } = require('../config/db');

class WorkoutController {
    getAll = async (req, res) => {
        try {
            // Подтягиваем только тренировки текущего пользователя
            const result = await pool.query(`
                SELECT w.*, t.name as template_name 
                FROM workouts w 
                LEFT JOIN templates t ON w.template_id = t.id 
                WHERE w.user_id = $1
                ORDER BY w.workout_date DESC
            `, [req.user.id]); // Важно: тут должна быть фильтрация по user_id! Мы добавим колонку user_id в workouts, если ее нет.
            
            res.json({ success: true, data: result.rows });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    getById = async (req, res) => {
        try {
            // Получаем саму тренировку
            const wRes = await pool.query('SELECT * FROM workouts WHERE id = $1', [req.params.id]);
            if (wRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Тренировка не найдена' });
            
            const workout = wRes.rows[0];

            // Получаем упражнения тренировки
            const exRes = await pool.query(`
                SELECT we.id as we_id, we.superset_id, we.sort_order, e.*
                FROM workout_exercises we
                JOIN exercises e ON we.exercise_id = e.id
                WHERE we.workout_id = $1 
                ORDER BY we.sort_order
            `, [workout.id]);

            workout.exercises = exRes.rows;

            // Получаем подходы для каждого упражнения
            for (let ex of workout.exercises) {
                const setRes = await pool.query('SELECT * FROM sets WHERE workout_exercise_id = $1 ORDER BY set_order', [ex.we_id]);
                ex.sets = setRes.rows;
            }

            res.json({ success: true, data: workout });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    create = async (req, res) => {
        try {
            const { title, template_id, workout_date, exercises } = req.body;
            
            // 1. Создаем тренировку (Нужно убедиться, что колонка user_id есть в workouts)
            const wRes = await pool.query(
                'INSERT INTO workouts (title, template_id, workout_date, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
                [title, template_id || null, workout_date || new Date(), req.user.id]
            );
            const workoutId = wRes.rows[0].id;

            // 2. Сохраняем упражнения и подходы
            if (exercises && exercises.length > 0) {
                for (let i = 0; i < exercises.length; i++) {
                    const ex = exercises[i];
                    const weRes = await pool.query(
                        'INSERT INTO workout_exercises (workout_id, exercise_id, superset_id, sort_order) VALUES ($1, $2, $3, $4) RETURNING id',
                        [workoutId, ex.id, ex.superset_id || null, i]
                    );
                    const weId = weRes.rows[0].id;

                    if (ex.sets && ex.sets.length > 0) {
                        for (let j = 0; j < ex.sets.length; j++) {
                            const set = ex.sets[j];
                            await pool.query(
                                'INSERT INTO sets (workout_exercise_id, set_order, weight, reps, duration_sec, distance_m, completed) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                                [weId, j, set.weight || null, set.reps || null, set.duration_sec || null, set.distance_m || null, set.completed || false]
                            );
                        }
                    }
                }
            }
            res.json({ success: true, data: wRes.rows[0] });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    update = async (req, res) => {
        try {
            const { title, workout_date, exercises } = req.body;
            const workoutId = req.params.id;

            const wRes = await pool.query(
                'UPDATE workouts SET title = $1, workout_date = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
                [title, workout_date || new Date(), workoutId, req.user.id]
            );

            if (wRes.rows.length === 0) return res.status(403).json({ success: false, error: 'Нет прав или не найдено' });

            // Жесткое обновление: удаляем все старые упражнения (подходы удалятся каскадно) и пишем новые
            await pool.query('DELETE FROM workout_exercises WHERE workout_id = $1', [workoutId]);

            if (exercises && exercises.length > 0) {
                for (let i = 0; i < exercises.length; i++) {
                    const ex = exercises[i];
                    const weRes = await pool.query(
                        'INSERT INTO workout_exercises (workout_id, exercise_id, superset_id, sort_order) VALUES ($1, $2, $3, $4) RETURNING id',
                        [workoutId, ex.id, ex.superset_id || null, i]
                    );
                    const weId = weRes.rows[0].id;

                    if (ex.sets && ex.sets.length > 0) {
                        for (let j = 0; j < ex.sets.length; j++) {
                            const set = ex.sets[j];
                            await pool.query(
                                'INSERT INTO sets (workout_exercise_id, set_order, weight, reps, duration_sec, distance_m, completed) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                                [weId, j, set.weight || null, set.reps || null, set.duration_sec || null, set.distance_m || null, set.completed || false]
                            );
                        }
                    }
                }
            }
            res.json({ success: true, data: wRes.rows[0] });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    delete = async (req, res) => {
        try {
            const result = await pool.query('DELETE FROM workouts WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
            if (result.rows.length === 0) return res.status(403).json({ success: false, error: 'Нет прав' });
            res.json({ success: true, message: 'Удалено' });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }
}

module.exports = new WorkoutController();