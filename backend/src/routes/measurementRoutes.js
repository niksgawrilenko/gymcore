const express = require('express');
const router = express.Router();
const measurementController = require('../controllers/measurementController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken); 

router.get('/', measurementController.getAll);
router.post('/', measurementController.create);
router.delete('/:id', measurementController.delete);

module.exports = router;