const { Router } = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const challengeController = require('../controllers/challengeController');

const router = Router();

router.get('/', authenticate, challengeController.getAll);
router.get('/:id', authenticate, challengeController.getById);
router.post('/:id/hint', authenticate, challengeController.requestHint);

module.exports = router;
