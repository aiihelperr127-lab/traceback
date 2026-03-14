const { Router } = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');

const router = Router();

router.post('/register', authenticate, authController.register);
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
