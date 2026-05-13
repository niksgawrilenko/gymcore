const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-gymcore-key-2024';

class AuthController {
    register = async (req, res) => {
        const { username, password } = req.body;
        try {
            const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
            if (userCheck.rows.length > 0) {
                return res.status(400).json({ success: false, error: 'Пользователь с таким именем уже существует' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const newUser = await pool.query(
                'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, role',
                [username, hashedPassword]
            );

            const token = jwt.sign({ id: newUser.rows[0].id, username }, JWT_SECRET, { expiresIn: '30d' });
            res.json({ success: true, token, user: { id: newUser.rows[0].id, username, role: newUser.rows[0].role } });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }

    login = async (req, res) => {
        const { username, password } = req.body;
        try {
            const userRes = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
            if (userRes.rows.length === 0) return res.status(400).json({ success: false, error: 'Неверный логин или пароль' });

            const user = userRes.rows[0];
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) return res.status(400).json({ success: false, error: 'Неверный логин или пароль' });

            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
            res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role } });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    }
}

module.exports = new AuthController();