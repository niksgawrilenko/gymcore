const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Базовый путь в server.js будет '/api/auth', поэтому здесь пишем только '/register'
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;