require('dotenv').config();
const express = require('express');
const cors = require('cors');

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

// Базовые middleware
app.use(cors());
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

// ==========================================
// ЗАПУСК СЕРВЕРА
// ==========================================
const startServer = async () => {
    await initDB();
    app.listen(port, () => {
        console.log(`[SERVER] 🚀 Сервер запущен на http://localhost:${port}`);
    });
};

startServer();