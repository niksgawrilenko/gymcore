const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-gymcore-key-2024';

// Проверка JWT токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) return res.status(401).json({ success: false, error: 'Доступ запрещен. Нужна авторизация.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, error: 'Токен недействителен или истек.' });
        req.user = user; 
        next();
    });
};

// Проверка прав администратора
const requireAdmin = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Доступ запрещен. Требуются права администратора.' });
        }
        next();
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { authenticateToken, requireAdmin };