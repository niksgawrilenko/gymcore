require('dotenv').config(); // Подключаем чтение из .env
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
// Берем порт из .env или используем 5000 как запасной
const port = process.env.PORT || 5000;

app.use(cors());

// Берем настройки БД из .env
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

app.get('/api/status', async (req, res) => {
    try {
        const dbResponse = await pool.query('SELECT NOW() as db_time, version() as db_version');
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

app.listen(port, () => {
    console.log(`=================================`);
    console.log(`🚀 Сервер GymCore запущен!`);
    console.log(`🌐 Адрес API: http://localhost:${port}/api/status`);
    console.log(`=================================`);
});