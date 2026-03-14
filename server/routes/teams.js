const { Router } = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const teamController = require('../controllers/teamController');

const router = Router();
router.use(authenticate);

router.get('/mine', teamController.getMyTeam);
router.post('/create', teamController.createTeam);
router.post('/join', teamController.joinTeam);
router.post('/leave', teamController.leaveTeam);

module.exports = router;
