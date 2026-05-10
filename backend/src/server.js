require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Импортируем наше подключение и функцию миграции
const { pool, initDB } = require('./db');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());

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

// Сначала инициализируем базу данных, а только потом запускаем сервер
initDB().then(() => {
    app.listen(port, () => {
        console.log(`=================================`);
        console.log(`🚀 Сервер GymCore запущен!`);
        console.log(`🌐 Адрес API: http://localhost:${port}/api/status`);
        console.log(`=================================`);
    });
});