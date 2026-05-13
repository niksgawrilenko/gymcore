const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken); // Защищаем все маршруты

router.get('/', templateController.getAll);
router.get('/:id', templateController.getById);
router.post('/', templateController.create);
router.patch('/:id', templateController.update);
router.delete('/:id', templateController.delete);
router.post('/:id/moderate', templateController.moderate);

module.exports = router;