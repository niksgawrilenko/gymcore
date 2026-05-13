const express = require('express');
const router = express.Router();
const exerciseController = require('../controllers/exerciseController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken); // Защищаем все маршруты ниже
router.get('/', exerciseController.getAll);
router.get('/:id', exerciseController.getById);
router.post('/', exerciseController.create);
router.patch('/:id', exerciseController.update);
router.delete('/:id', exerciseController.delete);
router.post('/:id/moderate', exerciseController.moderate);

module.exports = router;