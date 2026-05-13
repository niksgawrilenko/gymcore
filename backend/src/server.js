// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, initDB } = require('./db');

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-gymcore-key-2024';

app.use(cors());
app.use(express.json());

// ==========================================
// MIDDLEWARE: Проверка токена
// ==========================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) return res.status(401).json({ success: false, error: 'Доступ запрещен. Нужна авторизация.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, error: 'Токен недействителен или истек.' });
        req.user = user; 
        next();
    });
};

// ==========================================
// 1. КОНТРОЛЛЕР АВТОРИЗАЦИИ (AuthController)
// ==========================================
class AuthController {
    register = async (req, res) => {
        const { username, password } = req.body;
        try {
            const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
            if (userCheck.rows.length > 0) {
                return res.status(400).json({ success: false, error: 'Пользователь с таким именем уже существует' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const newUser = await pool.query(
                'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, role',
                [username, hashedPassword]
            );

            const token = jwt.sign({ id: newUser.rows[0].id, username }, JWT_SECRET, { expiresIn: '30d' });
            res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role } });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    login = async (req, res) => {
        const { username, password } = req.body;
        try {
            const userRes = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
            if (userRes.rows.length === 0) return res.status(400).json({ success: false, error: 'Неверный логин или пароль' });

            const user = userRes.rows[0];
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) return res.status(400).json({ success: false, error: 'Неверный логин или пароль' });

            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
            res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role } });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }
}

// ==========================================
// 2. КОНТРОЛЛЕР УПРАЖНЕНИЙ (ExerciseController)
// ==========================================
class ExerciseController {
    getAll = async (req, res) => {
        try {
            const dbRes = await pool.query(`
                SELECT * FROM exercises 
                WHERE user_id = $1 OR user_id IS NULL OR is_public = true 
                ORDER BY name ASC
            `, [req.user.id]);
            res.json({ success: true, data: dbRes.rows });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    getById = async (req, res) => {
        try {
            const dbRes = await pool.query(`
                SELECT * FROM exercises 
                WHERE id = $1 AND (user_id = $2 OR user_id IS NULL OR is_public = true)
            `, [req.params.id, req.user.id]);
            if (dbRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Не найдено или нет доступа' });
            res.json({ success: true, data: dbRes.rows[0] });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    create = async (req, res) => {
        try {
            const { name, category, exercise_type } = req.body;
            const dbRes = await pool.query(
                'INSERT INTO exercises (name, category, exercise_type, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
                [name, category, exercise_type, req.user.id]
            );
            res.json({ success: true, data: dbRes.rows[0] });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    update = async (req, res) => {
        try {
            const { name, category, exercise_type } = req.body;
            const dbRes = await pool.query(
                'UPDATE exercises SET name = $1, category = $2, exercise_type = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
                [name, category, exercise_type, req.params.id, req.user.id]
            );
            if (dbRes.rows.length === 0) return res.status(403).json({ success: false, error: 'Нет прав на редактирование этого упражнения' });
            res.json({ success: true, data: dbRes.rows[0] });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    delete = async (req, res) => {
        try {
            const dbRes = await pool.query('DELETE FROM exercises WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
            if (dbRes.rows.length === 0) return res.status(403).json({ success: false, error: 'Нет прав на удаление этого упражнения' });
            res.json({ success: true, message: 'Упражнение удалено' });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }
}

// ==========================================
// 3. КОНТРОЛЛЕР ШАБЛОНОВ (TemplateController)
// ==========================================
class TemplateController {
    getAll = async (req, res) => {
        try {
            const dbRes = await pool.query(`
                SELECT * FROM templates 
                WHERE user_id = $1 OR user_id IS NULL OR is_public = true 
                ORDER BY id ASC
            `, [req.user.id]);
            res.json({ success: true, data: dbRes.rows });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    getById = async (req, res) => {
        try {
            const tplRes = await pool.query(`
                SELECT * FROM templates 
                WHERE id = $1 AND (user_id = $2 OR user_id IS NULL OR is_public = true)
            `, [req.params.id, req.user.id]);
            
            if (tplRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Шаблон не найден или нет доступа' });
            
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
                'INSERT INTO templates (name, description, user_id) VALUES ($1, $2, $3) RETURNING id',
                [name || 'Новый шаблон', description || 'Создано пользователем', req.user.id]
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
            // Проверяем права перед обновлением
            const updRes = await client.query('UPDATE templates SET name = $1, description = $2 WHERE id = $3 AND user_id = $4 RETURNING id', [name, description, id, req.user.id]);
            
            if (updRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(403).json({ success: false, error: 'Нет прав на редактирование этого шаблона' });
            }
            
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
            const dbRes = await pool.query('DELETE FROM templates WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
            if (dbRes.rows.length === 0) return res.status(403).json({ success: false, error: 'Нет прав на удаление этого шаблона' });
            res.json({ success: true, message: 'Шаблон удален' });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }
}

// ==========================================
// 4. КОНТРОЛЛЕР ТРЕНИРОВОК (WorkoutController)
// ==========================================
class WorkoutController {
    getAll = async (req, res) => {
        try {
            // Тренировки - строго личные
            const dbRes = await pool.query('SELECT id, title, workout_date FROM workouts WHERE user_id = $1 ORDER BY workout_date DESC LIMIT 50', [req.user.id]);
            res.json({ success: true, data: dbRes.rows });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    getById = async (req, res) => {
        try {
            const workoutRes = await pool.query('SELECT * FROM workouts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
            if (workoutRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Не найдено или нет доступа' });
            
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
                'INSERT INTO workouts (title, template_id, workout_date, user_id) VALUES ($1, $2, $3, $4) RETURNING id',
                [title || 'Новая тренировка', template_id || null, workout_date || new Date(), req.user.id]
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
            const updRes = await client.query('UPDATE workouts SET title = $1, workout_date = $2 WHERE id = $3 AND user_id = $4 RETURNING id', [title, workout_date, id, req.user.id]);

            if (updRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(403).json({ success: false, error: 'Нет прав или не найдено' });
            }

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
            const dbRes = await pool.query('DELETE FROM workouts WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
            if (dbRes.rows.length === 0) return res.status(403).json({ success: false, error: 'Нет прав' });
            res.json({ success: true, message: 'Тренировка удалена' });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }
}

// ==========================================
// 5. МАРШРУТИЗАЦИЯ (Router Setup)
// ==========================================
const auth = new AuthController();
app.post('/api/auth/register', auth.register);
app.post('/api/auth/login', auth.login);

// Все остальные эндпоинты теперь защищены токеном!
const exercises = new ExerciseController();
app.get('/api/exercises', authenticateToken, exercises.getAll);
app.get('/api/exercises/:id', authenticateToken, exercises.getById);
app.post('/api/exercises', authenticateToken, exercises.create);
app.patch('/api/exercises/:id', authenticateToken, exercises.update);
app.delete('/api/exercises/:id', authenticateToken, exercises.delete);

const templates = new TemplateController();
app.get('/api/templates', authenticateToken, templates.getAll);
app.get('/api/templates/:id', authenticateToken, templates.getById);
app.post('/api/templates', authenticateToken, templates.create);
app.patch('/api/templates/:id', authenticateToken, templates.update);
app.delete('/api/templates/:id', authenticateToken, templates.delete);

const workouts = new WorkoutController();
app.get('/api/workouts', authenticateToken, workouts.getAll);
app.get('/api/workouts/:id', authenticateToken, workouts.getById);
app.post('/api/workouts', authenticateToken, workouts.create);
app.patch('/api/workouts/:id', authenticateToken, workouts.update);
app.delete('/api/workouts/:id', authenticateToken, workouts.delete);

app.get('/api/status', async (req, res) => {
    try {
        const dbRes = await pool.query('SELECT NOW() as db_time');
        res.json({ success: true, databaseTime: dbRes.rows[0].db_time });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Запуск сервера
initDB().then(() => { 
    app.listen(port, () => console.log(`🚀 Сервер запущен на порту ${port}. Аутентификация и проверка прав включены!`)); 
});

// ==========================================
// 6. МАРШРУТЫ ШЕРИНГА И МОДЕРАЦИИ (НОВОЕ)
// ==========================================

// Middleware проверки прав админа
const requireAdmin = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Доступ запрещен. Требуются права администратора.' });
        }
        next();
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// --- АДМИН ПАНЕЛЬ ---
app.get('/api/admin/pending', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const exercises = await pool.query("SELECT * FROM exercises WHERE moderation_status = 'pending'");
        const templates = await pool.query("SELECT * FROM templates WHERE moderation_status = 'pending'");
        res.json({ success: true, data: { exercises: exercises.rows, templates: templates.rows } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/admin/approve/:type/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { type, id } = req.params;
    const table = type === 'exercise' ? 'exercises' : 'templates';
    try {
        await pool.query(`UPDATE ${table} SET moderation_status = 'approved', is_public = true WHERE id = $1`, [id]);
        res.json({ success: true, message: 'Одобрено и опубликовано' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/admin/reject/:type/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { type, id } = req.params;
    const table = type === 'exercise' ? 'exercises' : 'templates';
    try {
        await pool.query(`UPDATE ${table} SET moderation_status = 'rejected' WHERE id = $1`, [id]);
        res.json({ success: true, message: 'Отклонено' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- ОТПРАВКА НА МОДЕРАЦИЮ ---
app.post('/api/exercises/:id/moderate', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query("UPDATE exercises SET moderation_status = 'pending' WHERE id = $1 AND user_id = $2 RETURNING *", [req.params.id, req.user.id]);
        if (result.rows.length === 0) return res.status(403).json({ success: false, error: 'Нет доступа' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/templates/:id/moderate', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query("UPDATE templates SET moderation_status = 'pending' WHERE id = $1 AND user_id = $2 RETURNING *", [req.params.id, req.user.id]);
        if (result.rows.length === 0) return res.status(403).json({ success: false, error: 'Нет доступа' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- ПУБЛИЧНЫЙ ДОСТУП ПО SHARE_ID ---
app.get('/api/shared/exercises/:shareId', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM exercises WHERE share_id = $1', [req.params.shareId]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Упражнение не найдено' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/shared/templates/:shareId', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM templates WHERE share_id = $1', [req.params.shareId]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Шаблон не найден' });
        
        const tpl = result.rows[0];
        const exRes = await pool.query(`
            SELECT e.*, te.sort_order 
            FROM exercises e 
            JOIN template_exercises te ON e.id = te.exercise_id 
            WHERE te.template_id = $1 
            ORDER BY te.sort_order
        `, [tpl.id]);
        
        tpl.exercises = exRes.rows;
        res.json({ success: true, data: tpl });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});