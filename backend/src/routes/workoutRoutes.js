const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/', workoutController.getAll);

router.get('/history-map', workoutController.getHistoryMap); 

router.get('/:id', workoutController.getById);
router.post('/', workoutController.create);
router.patch('/:id', workoutController.update);
router.delete('/:id', workoutController.delete);

module.exports = router;