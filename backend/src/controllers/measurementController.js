const { pool } = require('../config/db');

class MeasurementController {
    // Получить историю замеров
    async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20; // по умолчанию 20 замеров
            const offset = (page - 1) * limit;

            const result = await pool.query(
                `SELECT * FROM measurements 
                 WHERE user_id = $1 
                 ORDER BY date DESC 
                 LIMIT $2 OFFSET $3`,
                [req.user.id, limit, offset]
            );
            
            res.json({ success: true, data: result.rows });
        } catch (e) {
            console.error('[MEASUREMENTS GET ERROR]:', e);
            res.status(500).json({ success: false, error: 'Ошибка сервера при получении замеров' });
        }
    }

    // Добавить новый замер
    async create(req, res) {
        try {
            const { date, weight, chest, waist, biceps, thighs, calves, shoulders, neck } = req.body;
            
            // ИСПРАВЛЕНИЕ: Превращаем миллисекунды от фронтенда в правильный объект Date для Postgres
            const validDate = date ? new Date(date) : new Date();
            
            const result = await pool.query(
                `INSERT INTO measurements 
                (user_id, date, weight, chest, waist, biceps, thighs, calves, shoulders, neck) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
                [req.user.id, validDate, weight || null, chest || null, waist || null, biceps || null, thighs || null, calves || null, shoulders || null, neck || null]
            );
            
            res.json({ success: true, data: result.rows[0] });
        } catch (e) {
            console.error('[MEASUREMENTS CREATE ERROR]:', e); // Теперь мы увидим реальную ошибку в терминале!
            res.status(500).json({ success: false, error: 'Ошибка при сохранении замеров' });
        }
    }

    // Удалить замер
    async delete(req, res) {
        try {
            const result = await pool.query(
                'DELETE FROM measurements WHERE id = $1 AND user_id = $2 RETURNING id',
                [req.params.id, req.user.id]
            );
            if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Запись не найдена' });
            res.json({ success: true, message: 'Замер удален' });
        } catch (e) {
            console.error('[MEASUREMENTS DELETE ERROR]:', e);
            res.status(500).json({ success: false, error: 'Ошибка сервера' });
        }
    }
}

module.exports = new MeasurementController();