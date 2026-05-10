// backend/src/db.js
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

const initDB = async () => {
    // SQL-скрипт, который гарантирует, что структура БД существует
    const queryText = `
        CREATE TABLE IF NOT EXISTS exercises (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            category VARCHAR(100) DEFAULT 'Общее',
            is_custom BOOLEAN DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS workouts (
            id SERIAL PRIMARY KEY,
            workout_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            title VARCHAR(255) DEFAULT 'Новая тренировка',
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS sets (
            id SERIAL PRIMARY KEY,
            workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
            exercise_id INTEGER REFERENCES exercises(id),
            weight DECIMAL(6, 2),
            reps INTEGER,
            rest_time INTEGER DEFAULT 60,
            set_order INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Добавляем базу упражнений. Если такие уже есть, пропускаем (ON CONFLICT DO NOTHING)
        INSERT INTO exercises (name, category) VALUES 
        ('Жим лежа', 'Грудь'),
        ('Приседания со штангой', 'Ноги'),
        ('Становая тяга', 'Спина'),
        ('Подтягивания', 'Спина'),
        ('Армейский жим', 'Плечи')
        ON CONFLICT (name) DO NOTHING;
    `;

    try {
        await pool.query(queryText);
        console.log('✅ Структура БД проверена и готова к работе!');
    } catch (error) {
        console.error('❌ Ошибка инициализации БД:', error);
    }
};

module.exports = { pool, initDB };