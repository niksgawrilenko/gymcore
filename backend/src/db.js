// backend/src/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gymcore',
    password: process.env.DB_PASSWORD || '12345',
    port: process.env.DB_PORT || 5432,
});

// Умная функция для добавления колонок без удаления старых данных
async function addColumnIfNotExists(tableName, columnName, columnType) {
    const res = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name=$1 AND column_name=$2
    `, [tableName, columnName]);
    
    if (res.rows.length === 0) {
        await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
        console.log(`[DB] ⚡ Добавлена колонка ${columnName} в ${tableName}`);
    }
}

const initDB = async () => {
    try {
        console.log('Подключение к БД...');

        // 1. ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. БАЗОВЫЕ ТАБЛИЦЫ (старый код создания)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS exercises (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50),
                exercise_type VARCHAR(20) DEFAULT 'strength'
            );
            CREATE TABLE IF NOT EXISTS templates (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT
            );
            CREATE TABLE IF NOT EXISTS template_exercises (
                id SERIAL PRIMARY KEY,
                template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE,
                exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
                sort_order INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS workouts (
                id SERIAL PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
                workout_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS workout_exercises (
                id SERIAL PRIMARY KEY,
                workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
                exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
                superset_id VARCHAR(50),
                sort_order INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS sets (
                id SERIAL PRIMARY KEY,
                workout_exercise_id INTEGER REFERENCES workout_exercises(id) ON DELETE CASCADE,
                set_order INTEGER DEFAULT 0,
                weight NUMERIC(5,2),
                reps INTEGER,
                duration_sec INTEGER,
                distance_m INTEGER,
                completed BOOLEAN DEFAULT false
            );
        `);

        // 3. МИГРАЦИЯ: ДОБАВЛЯЕМ НОВЫЕ КОЛОНКИ К СТАРЫМ ТАБЛИЦАМ
        // Для упражнений
        await addColumnIfNotExists('exercises', 'user_id', 'INTEGER REFERENCES users(id) ON DELETE CASCADE');
        await addColumnIfNotExists('exercises', 'is_public', 'BOOLEAN DEFAULT false');
        await addColumnIfNotExists('exercises', 'share_id', 'UUID DEFAULT gen_random_uuid()'); // Для будущих ссылок

        // Для шаблонов
        await addColumnIfNotExists('templates', 'user_id', 'INTEGER REFERENCES users(id) ON DELETE CASCADE');
        await addColumnIfNotExists('templates', 'is_public', 'BOOLEAN DEFAULT false');
        await addColumnIfNotExists('templates', 'share_id', 'UUID DEFAULT gen_random_uuid()');

        // Для тренировок
        await addColumnIfNotExists('workouts', 'user_id', 'INTEGER REFERENCES users(id) ON DELETE CASCADE');
        await addColumnIfNotExists('workouts', 'share_id', 'UUID DEFAULT gen_random_uuid()');

        console.log('✅ База данных успешно инициализирована и обновлена (Multi-user mode ready).');
    } catch (err) {
        console.error('❌ Ошибка инициализации БД:', err);
    }
};

module.exports = { pool, initDB };