// backend/src/db.js
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

const initDB = async () => {
    const dropOldTablesQuery = `
        DROP TABLE IF EXISTS sets CASCADE;
        DROP TABLE IF EXISTS workout_exercises CASCADE;
        DROP TABLE IF EXISTS workouts CASCADE;
        DROP TABLE IF EXISTS template_exercises CASCADE; -- Новая таблица
        DROP TABLE IF EXISTS templates CASCADE;
        DROP TABLE IF EXISTS exercises CASCADE;
    `;

    const createTablesQuery = `
        CREATE TABLE exercises (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            category VARCHAR(100) DEFAULT 'Общее',
            exercise_type VARCHAR(50) DEFAULT 'strength',
            is_custom BOOLEAN DEFAULT FALSE
        );

        CREATE TABLE templates (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            description TEXT
        );

        -- НОВАЯ ТАБЛИЦА: Какие упражнения лежат в шаблоне
        CREATE TABLE template_exercises (
            id SERIAL PRIMARY KEY,
            template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE,
            exercise_id INTEGER REFERENCES exercises(id),
            sort_order INTEGER
        );

        CREATE TABLE workouts (
            id SERIAL PRIMARY KEY,
            workout_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
            title VARCHAR(255) DEFAULT 'Новая тренировка',
            notes TEXT
        );

        CREATE TABLE workout_exercises (
            id SERIAL PRIMARY KEY,
            workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
            exercise_id INTEGER REFERENCES exercises(id),
            sort_order INTEGER,
            superset_id VARCHAR(50)
        );

        CREATE TABLE sets (
            id SERIAL PRIMARY KEY,
            workout_exercise_id INTEGER REFERENCES workout_exercises(id) ON DELETE CASCADE,
            set_order INTEGER,
            weight DECIMAL(6, 2),
            reps INTEGER,
            duration_sec INTEGER,
            distance_m INTEGER,
            completed BOOLEAN DEFAULT FALSE -- Добавили статус выполнения
        );
    `;

    const seedDataQuery = `
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

        INSERT INTO templates (name, description) VALUES
        ('Верх', 'Тренировка верхней части тела'),
        ('Нижняя и ноги', 'Тренировка ног и низа спины')
        ON CONFLICT (name) DO NOTHING;

        -- ПРИВЯЗЫВАЕМ УПРАЖНЕНИЯ К ШАБЛОНАМ
        -- Шаблон 1: Верх (ID = 1)
        INSERT INTO template_exercises (template_id, exercise_id, sort_order)
        SELECT 1, id, 1 FROM exercises WHERE name = 'Дорожка' UNION ALL
        SELECT 1, id, 2 FROM exercises WHERE name = 'Жим штанги лежа' UNION ALL
        SELECT 1, id, 3 FROM exercises WHERE name = 'Тяга сверху широким' UNION ALL
        SELECT 1, id, 4 FROM exercises WHERE name = 'Пэг-дек' UNION ALL
        SELECT 1, id, 5 FROM exercises WHERE name = 'Гребля';

        -- Шаблон 2: Нижняя и ноги (ID = 2)
        INSERT INTO template_exercises (template_id, exercise_id, sort_order)
        SELECT 2, id, 1 FROM exercises WHERE name = 'Орбитрек' UNION ALL
        SELECT 2, id, 2 FROM exercises WHERE name = 'Разгибание ног' UNION ALL
        SELECT 2, id, 3 FROM exercises WHERE name = 'Горизонт. жим ногами' UNION ALL
        SELECT 2, id, 4 FROM exercises WHERE name = 'Сгибание ног' UNION ALL
        SELECT 2, id, 5 FROM exercises WHERE name = 'Выпады в смите';
    `;

    try {
        await pool.query(dropOldTablesQuery);
        await pool.query(createTablesQuery);
        await pool.query(seedDataQuery);
        console.log('✅ База пересобрана! Добавлены template_exercises.');
    } catch (error) {
        console.error('❌ Ошибка инициализации БД:', error);
    }
};

module.exports = { pool, initDB };