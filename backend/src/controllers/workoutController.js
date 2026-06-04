const { pool } = require('../config/db');

class WorkoutController {
    getAll = async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 100; // По умолчанию отдаем больше для статы
            const offset = (page - 1) * limit;

            // Умный запрос: собираем тренировки + их упражнения + их подходы в единый JSON
            const result = await pool.query(`
                SELECT 
                    w.*, 
                    t.name as template_name,
                    COALESCE(
                        (
                            SELECT json_agg(
                                json_build_object(
                                    'id', e.id,
                                    'exercise_id', e.id,
                                    'name', e.name,
                                    'category', e.category,
                                    'sets', COALESCE(
                                        (
                                            SELECT json_agg(
                                                json_build_object(
                                                    'weight', s.weight,
                                                    'reps', s.reps,
                                                    'completed', s.completed
                                                )
                                            )
                                            FROM sets s 
                                            WHERE s.workout_exercise_id = we.id
                                        ), '[]'::json
                                    )
                                )
                            )
                            FROM workout_exercises we
                            JOIN exercises e ON we.exercise_id = e.id
                            WHERE we.workout_id = w.id
                        ), '[]'::json
                    ) as exercises
                FROM workouts w 
                LEFT JOIN templates t ON w.template_id = t.id 
                WHERE w.user_id = $1
                ORDER BY w.workout_date DESC
                LIMIT $2 OFFSET $3
            `, [req.user.id, limit, offset]);

            const countRes = await pool.query(
                'SELECT COUNT(*) FROM workouts WHERE user_id = $1', 
                [req.user.id]
            );
            const totalWorkouts = parseInt(countRes.rows[0].count, 10);

            res.json({ 
                success: true, 
                data: result.rows,
                pagination: { 
                    page, 
                    limit, 
                    total: totalWorkouts, 
                    totalPages: Math.ceil(totalWorkouts / limit) 
                }
            });
        } catch (e) {
            console.error('[Workout getAll Error]:', e);
            res.status(500).json({ success: false, error: e.message });
        }
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

    getHistoryMap = async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT w.workout_date, e.name as base_name, s.weight, s.reps, s.set_order
                FROM workouts w
                JOIN workout_exercises we ON w.id = we.workout_id
                JOIN exercises e ON we.exercise_id = e.id
                JOIN sets s ON we.id = s.workout_exercise_id
                WHERE w.user_id = $1 AND (s.weight IS NOT NULL OR s.reps IS NOT NULL)
                ORDER BY w.workout_date DESC, s.set_order ASC
            `, [req.user.id]);

            const historyMap = {};

            result.rows.forEach(row => {
                if (!row.base_name) return;
                
                const nameKey = row.base_name.trim().toLowerCase();
                if (!historyMap[nameKey]) historyMap[nameKey] = [];

                if (!historyMap[nameKey][row.set_order]) {
                    historyMap[nameKey][row.set_order] = { weight: null, reps: null };
                }

                const current = historyMap[nameKey][row.set_order];

                const w = parseFloat(row.weight);
                if (current.weight === null && !isNaN(w) && w > 0) {
                    current.weight = row.weight;
                }

                const r = parseInt(row.reps);
                if (current.reps === null && !isNaN(r) && r > 0) {
                    current.reps = row.reps;
                }
            });

            res.json({ success: true, data: historyMap });
        } catch (e) { 
            console.error('[HistoryMap Error]:', e);
            res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' }); 
        }
    }
    // Быстрый сбор всей статистики юзера без пересылки тяжелых JSON
    getStats = async (req, res) => {
        try {
            const userId = req.user.id;
            
            const wCount = await pool.query('SELECT COUNT(*) FROM workouts WHERE user_id = $1', [userId]);
            const tCount = await pool.query('SELECT COUNT(*) FROM templates WHERE user_id = $1', [userId]);
            const eCount = await pool.query('SELECT COUNT(*) FROM exercises WHERE user_id = $1', [userId]);
            
            // Если нужно, здесь же можно SQL-запросом посчитать тоннаж, 
            // но для простоты мы хотя бы не гоняем массивы по сети
            
            res.json({
                success: true,
                data: {
                    workoutsCount: parseInt(wCount.rows[0].count),
                    templatesCount: parseInt(tCount.rows[0].count),
                    exercisesCount: parseInt(eCount.rows[0].count),
                }
            });
        } catch (e) {
            res.status(500).json({ success: false });
        }
    }

    // Получение точной аналитики прямо из БД
    getAnalytics = async (req, res) => {
        try {
            const userId = req.user.id;
            
            // ИСПРАВЛЕНИЕ: Берем вес (weight) и повторения (reps) из таблицы sets (s)
            const statsRes = await pool.query(`
                SELECT 
                    COALESCE(SUM(s.weight * s.reps), 0) as total_volume, 
                    COUNT(s.id) as total_sets
                FROM sets s
                JOIN workout_exercises we ON s.workout_exercise_id = we.id
                JOIN workouts w ON we.workout_id = w.id
                WHERE w.user_id = $1
            `, [userId]);

            res.json({
                success: true,
                data: {
                    totalVolume: parseInt(statsRes.rows[0].total_volume, 10),
                    totalSets: parseInt(statsRes.rows[0].total_sets, 10)
                }
            });
        } catch (e) {
            console.error('[Analytics Error]:', e);
            res.status(500).json({ success: false, error: 'Ошибка расчета аналитики' });
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