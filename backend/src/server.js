require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Импортируем наше подключение и функцию миграции
const { pool, initDB } = require('./db');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. Маршрут: Статус сервера
app.get('/api/status', async (req, res) => {
    try {
        const dbResponse = await pool.query('SELECT NOW() as db_time');
        res.json({
            success: true,
            message: 'GymCore Backend (Secure Mode) is connected!',
            databaseTime: dbResponse.rows[0].db_time
        });
    } catch (error) {
        console.error('Ошибка БД:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Маршрут: Получение упражнений
app.get('/api/exercises', async (req, res) => {
    try {
        const dbResponse = await pool.query('SELECT * FROM exercises ORDER BY name ASC');
        res.json({ success: true, data: dbResponse.rows });
    } catch (error) {
        console.error('Ошибка получения упражнений:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Получение истории тренировок (сортировка от новых к старым)
app.get('/api/workouts', async (req, res) => {
    try {
        const dbResponse = await pool.query(`
            SELECT id, title, workout_date 
            FROM workouts 
            ORDER BY workout_date DESC 
            LIMIT 50
        `);
        res.json({ success: true, data: dbResponse.rows });
    } catch (error) {
        console.error('Ошибка получения истории:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Получение списка шаблонов
app.get('/api/templates', async (req, res) => {
    try {
        const dbResponse = await pool.query('SELECT * FROM templates ORDER BY id ASC');
        res.json({ success: true, data: dbResponse.rows });
    } catch (error) {
        console.error('Ошибка получения шаблонов:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. Получить конкретный шаблон с его упражнениями
app.get('/api/templates/:id', async (req, res) => {
    try {
        const templateId = req.params.id;
        
        // 1. Получаем инфу о самом шаблоне
        const tplRes = await pool.query('SELECT * FROM templates WHERE id = $1', [templateId]);
        if (tplRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Шаблон не найден' });
        
        const template = tplRes.rows[0];

        // 2. Получаем упражнения, привязанные к этому шаблону
        const exRes = await pool.query(`
            SELECT e.id, e.name, e.category, e.exercise_type, te.sort_order 
            FROM template_exercises te
            JOIN exercises e ON te.exercise_id = e.id
            WHERE te.template_id = $1
            ORDER BY te.sort_order ASC
        `, [templateId]);

        template.exercises = exRes.rows; // Добавляем массив упражнений в объект шаблона
        
        res.json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 6. ОБНОВЛЕННЫЙ МАРШРУТ: Сохранение тренировки
app.post('/api/workouts', async (req, res) => {
    // Получаем данные от фронтенда (добавили template_id)
    const { title, template_id, exercises } = req.body;
    
    // Подключаемся для сложной операции (Транзакции)
    const client = await pool.connect(); 

    try {
        await client.query('BEGIN'); // Начинаем запись. Если где-то будет ошибка, всё отменится

        // 1. Создаем запись о тренировке в календаре (теперь с привязкой к ID шаблона)
        const workoutRes = await client.query(
            'INSERT INTO workouts (title, template_id) VALUES ($1, $2) RETURNING id',
            [title || 'Новая тренировка', template_id || null]
        );
        const workoutId = workoutRes.rows[0].id;

        // 2. Проходимся по всем упражнениям в тренировке
        for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];
            
            // ИЗМЕНЕННЫЙ ЗАПРОС: Добавили сохранение superset_id
            const weRes = await client.query(
                'INSERT INTO workout_exercises (workout_id, exercise_id, sort_order, superset_id) VALUES ($1, $2, $3, $4) RETURNING id',
                [workoutId, ex.id, i, ex.superset_id || null]
            );
            const weId = weRes.rows[0].id;

            // 3. Сохраняем ТОЛЬКО ВЫПОЛНЕННЫЕ (зеленые) подходы
            const completedSets = ex.sets.filter(s => s.completed);
            
            for (let j = 0; j < completedSets.length; j++) {
                const set = completedSets[j];
                await client.query(
                    'INSERT INTO sets (workout_exercise_id, set_order, weight, reps) VALUES ($1, $2, $3, $4)',
                    [weId, j, set.weight || 0, set.reps || 0]
                );
            }
        }

        await client.query('COMMIT'); // Всё прошло успешно, сохраняем в БД!
        res.json({ success: true, workoutId });
    } catch (error) {
        await client.query('ROLLBACK'); // Если ошибка - откатываем БД назад
        console.error('Ошибка сохранения тренировки:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

// Сначала инициализируем базу данных, а только потом запускаем сервер
initDB().then(() => {
    app.listen(port, () => {
        console.log(`=================================`);
        console.log(`🚀 Сервер GymCore запущен!`);
        console.log(`🌐 Адрес API: http://localhost:${port}/api/status`);
        console.log(`=================================`);
    });
});