// backend/src/db.js
const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL 
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Обязательно для облачных БД
      }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'gymcore',
        password: process.env.DB_PASSWORD || '12345',
        port: process.env.DB_PORT || 5432,
    };

const pool = new Pool(poolConfig);

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

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

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
            -- НОВАЯ ТАБЛИЦА ДЛЯ ПОДХОДОВ В ШАБЛОНАХ
            CREATE TABLE IF NOT EXISTS template_sets (
                id SERIAL PRIMARY KEY,
                template_exercise_id INTEGER REFERENCES template_exercises(id) ON DELETE CASCADE,
                set_order INTEGER DEFAULT 0,
                weight NUMERIC(5,2),
                reps INTEGER,
                duration_sec INTEGER,
                distance_m INTEGER
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

        // МИГРАЦИЯ: ДОБАВЛЯЕМ НОВЫЕ КОЛОНКИ
        await addColumnIfNotExists('exercises', 'user_id', 'INTEGER REFERENCES users(id) ON DELETE CASCADE');
        await addColumnIfNotExists('exercises', 'is_public', 'BOOLEAN DEFAULT false');
        await addColumnIfNotExists('exercises', 'share_id', 'UUID DEFAULT gen_random_uuid()');
        
        // --- НОВОЕ ДЛЯ МОДЕРАЦИИ ---
        await addColumnIfNotExists('users', 'role', "VARCHAR(20) DEFAULT 'user'");
        await addColumnIfNotExists('exercises', 'moderation_status', "VARCHAR(20) DEFAULT 'none'");
        await addColumnIfNotExists('templates', 'moderation_status', "VARCHAR(20) DEFAULT 'none'");
        // ---------------------------

        await addColumnIfNotExists('templates', 'user_id', 'INTEGER REFERENCES users(id) ON DELETE CASCADE');
        await addColumnIfNotExists('templates', 'is_public', 'BOOLEAN DEFAULT false');
        await addColumnIfNotExists('templates', 'share_id', 'UUID DEFAULT gen_random_uuid()');

        await addColumnIfNotExists('template_exercises', 'superset_id', 'VARCHAR(50)');
        // ==========================================
        // --- НОВОЕ: АНАТОМИЯ И МУЛЬТИ-МЫШЦЫ ---
        // ==========================================
        // Массив основных групп (например: ['Грудь', 'Плечи'])
        await addColumnIfNotExists('exercises', 'primary_groups', "TEXT[] DEFAULT '{}'");
        await addColumnIfNotExists('exercises', 'secondary_muscles', "TEXT[] DEFAULT '{}'");
        await addColumnIfNotExists('workouts', 'user_id', 'INTEGER REFERENCES users(id) ON DELETE CASCADE');
        
        // =========================================================
        // ЖЕСТКОЕ УДАЛЕНИЕ СТАРОГО ПРАВИЛА УНИКАЛЬНОСТИ ИМЕН
        // =========================================================
        
        // 1. Для упражнений (уже было)
        try {
            await pool.query('ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_name_key CASCADE');
        } catch (e) {} 
        try {
            await pool.query('DROP INDEX IF EXISTS exercises_name_key CASCADE');
        } catch (e) {} 

        // 2. Для шаблонов (НОВОЕ)
        try {
            await pool.query('ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_name_key CASCADE');
        } catch (e) {} 
        try {
            await pool.query('DROP INDEX IF EXISTS templates_name_key CASCADE');
        } catch (e) {}

        // =========================================================
        // ИСПРАВЛЕНИЕ КАСКАДНОГО УДАЛЕНИЯ ДЛЯ УПРАЖНЕНИЙ
        // (Чтобы упражнение удалялось вместе с историей его выполнений)
        // =========================================================
        try {
            await pool.query('ALTER TABLE workout_exercises DROP CONSTRAINT IF EXISTS workout_exercises_exercise_id_fkey');
            await pool.query('ALTER TABLE workout_exercises ADD CONSTRAINT workout_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE');
            
            await pool.query('ALTER TABLE template_exercises DROP CONSTRAINT IF EXISTS template_exercises_exercise_id_fkey');
            await pool.query('ALTER TABLE template_exercises ADD CONSTRAINT template_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE');
        } catch (e) {
            console.log('Ошибка при обновлении внешних ключей:', e.message);
        }

        
        console.log('✅ База данных успешно инициализирована и обновлена (Multi-user mode ready).');
    } catch (err) {
        console.error('❌ Ошибка инициализации БД:', err);
    }
};

module.exports = { pool, initDB };