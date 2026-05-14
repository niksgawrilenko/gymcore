// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Подключение БД
const { initDB } = require('./config/db');

// Импорт маршрутов
const authRoutes = require('./routes/authRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const templateRoutes = require('./routes/templateRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const adminRoutes = require('./routes/adminRoutes');
const sharedRoutes = require('./routes/sharedRoutes');

const app = express();
const port = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARE БЕЗОПАСНОСТИ
// ==========================================

// 1. Helmet защищает от ряда стандартных уязвимостей, настраивая HTTP-заголовки
app.use(helmet());

// 2. CORS (Разрешаем запросы с любого домена для начала, на проде можно ограничить)
app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true // Полезно, если в будущем добавишь авторизацию через куки
}));

// 3. Ограничение запросов (Rate Limiting)
// Защищает от DDoS и перебора паролей (Brute-force)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // Лимит: 100 запросов с одного IP за окно в 15 минут
    standardHeaders: true, 
    legacyHeaders: false,
    message: { success: false, error: 'Слишком много запросов с вашего IP, попробуйте через 15 минут' }
});

// Применяем лимитер ко всем маршрутам API
app.use('/api/', limiter);

// Ограничиваем регистрацию и вход еще жестче (опционально)
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 10, // 10 попыток в час
    message: { success: false, error: 'Слишком много попыток входа, попробуйте позже' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Парсинг JSON
app.use(express.json());

// ==========================================
// ПОДКЛЮЧЕНИЕ РОУТОВ
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/shared', sharedRoutes);

// Глобальный обработчик ошибок (чтобы сервер не падал при фатальной ошибке)
app.use((err, req, res, next) => {
    console.error('[FATAL ERROR]:', err.stack);
    res.status(500).json({ success: false, error: 'Что-то пошло не так на стороне сервера' });
});

// ==========================================
// ЗАПУСК СЕРВЕРА
// ==========================================
const startServer = async () => {
    try {
        await initDB();
        app.listen(port, () => {
            console.log(`[SERVER] 🚀 Сервер запущен и защищен. Порт: ${port}`);
        });
    } catch (error) {
        console.error('[SERVER] ❌ Не удалось запустить сервер:', error);
        process.exit(1); // Выход с ошибкой
    }
};

startServer();