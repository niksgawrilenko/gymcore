// backend/src/routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const { uploadMiddleware } = require('../config/cloudinary');
const { uploadMedia } = require('../controllers/uploadController');

// Применяем middleware для парсинга файла 'file', затем передаем в контроллер
router.post('/', uploadMiddleware.single('file'), uploadMedia);

module.exports = router;