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
// НОВЫЙ МАРШРУТ: Сохранение тренировки
app.post('/api/workouts', async (req, res) => {
    // Получаем данные от фронтенда
    const { title, exercises } = req.body;
    
    // Подключаемся для сложной операции (Транзакции)
    const client = await pool.connect(); 

    try {
        await client.query('BEGIN'); // Начинаем запись. Если где-то будет ошибка, всё отменится

        // 1. Создаем запись о тренировке в календаре
        const workoutRes = await client.query(
            'INSERT INTO workouts (title) VALUES ($1) RETURNING id',
            [title || 'Новая тренировка']
        );
        const workoutId = workoutRes.rows[0].id;

        // 2. Проходимся по всем упражнениям в тренировке
        for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];
            
            const weRes = await client.query(
                'INSERT INTO workout_exercises (workout_id, exercise_id, sort_order) VALUES ($1, $2, $3) RETURNING id',
                [workoutId, ex.id, i]
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