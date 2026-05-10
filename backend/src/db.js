// backend/src/db.js
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

const initDB = async () => {
    // ВАЖНО: На этапе разработки мы удаляем старые таблицы, если они есть,
    // чтобы применить новую архитектуру. CASCADE удаляет все связанные данные.
    const dropOldTablesQuery = `
        DROP TABLE IF EXISTS sets CASCADE;
        DROP TABLE IF EXISTS workout_exercises CASCADE;
        DROP TABLE IF EXISTS workouts CASCADE;
        DROP TABLE IF EXISTS templates CASCADE;
        DROP TABLE IF EXISTS exercises CASCADE;
    `;

    const createTablesQuery = `
        -- 1. Справочник упражнений
        CREATE TABLE exercises (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            category VARCHAR(100) DEFAULT 'Общее',
            exercise_type VARCHAR(50) DEFAULT 'strength', -- 'strength' или 'cardio'
            is_custom BOOLEAN DEFAULT FALSE
        );

        -- 2. Шаблоны тренировок
        CREATE TABLE templates (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            description TEXT
        );

        -- 3. Журнал тренировок
        CREATE TABLE workouts (
            id SERIAL PRIMARY KEY,
            workout_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
            title VARCHAR(255) DEFAULT 'Новая тренировка',
            notes TEXT
        );

        -- 4. Блок упражнений в тренировке (связующее звено)
        CREATE TABLE workout_exercises (
            id SERIAL PRIMARY KEY,
            workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
            exercise_id INTEGER REFERENCES exercises(id),
            sort_order INTEGER,
            superset_id VARCHAR(50) -- Идентификатор для объединения в суперсеты
        );

        -- 5. Подходы
        CREATE TABLE sets (
            id SERIAL PRIMARY KEY,
            workout_exercise_id INTEGER REFERENCES workout_exercises(id) ON DELETE CASCADE,
            set_order INTEGER,
            weight DECIMAL(6, 2),
            reps INTEGER,
            duration_sec INTEGER, -- Время в секундах для кардио
            distance_m INTEGER,   -- Дистанция в метрах для кардио
            is_warmup BOOLEAN DEFAULT FALSE
        );
    `;

    const seedDataQuery = `
        -- Добавляем твои реальные упражнения
        INSERT INTO exercises (name, category, exercise_type) VALUES 
        ('Дорожка', 'Кардио', 'cardio'),
        ('Орбитрек', 'Кардио', 'cardio'),
        ('Гребля', 'Кардио', 'cardio'),
        ('Жим штанги лежа', 'Грудь', 'strength'),
        ('Жим штанги лежа в наклоне', 'Грудь', 'strength'),
        ('Сведения гантелей лежа', 'Грудь', 'strength'),
        ('Пэг-дек', 'Грудь', 'strength'),
        ('Обратный пэг-дек', 'Плечи/Спина', 'strength'),
        ('Тяга сверху широким', 'Спина', 'strength'),
        ('Тяга сидя обеими руками в тренажере', 'Спина', 'strength'),
        ('Гиперэкстензия', 'Спина', 'strength'),
        ('Разгибание ног', 'Ноги', 'strength'),
        ('Сгибание ног', 'Ноги', 'strength'),
        ('Сведение ног', 'Ноги', 'strength'),
        ('Разведение ног', 'Ноги', 'strength'),
        ('Горизонт. жим ногами', 'Ноги', 'strength'),
        ('Смит-приседания', 'Ноги', 'strength'),
        ('Выпады в смите', 'Ноги', 'strength'),
        ('Икры сидя', 'Ноги', 'strength')
        ON CONFLICT (name) DO NOTHING;

        -- Добавляем базовые шаблоны
        INSERT INTO templates (name, description) VALUES
        ('Верх', 'Тренировка верхней части тела'),
        ('Нижняя и ноги', 'Тренировка ног и низа спины')
        ON CONFLICT (name) DO NOTHING;
    `;

    try {
        await pool.query(dropOldTablesQuery);
        await pool.query(createTablesQuery);
        await pool.query(seedDataQuery);
        console.log('✅ Новая гибкая структура БД успешно создана и заполнена!');
    } catch (error) {
        console.error('❌ Ошибка инициализации БД:', error);
    }
};

module.exports = { pool, initDB };