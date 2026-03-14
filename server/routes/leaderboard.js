const { Router } = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const leaderboardController = require('../controllers/leaderboardController');

const router = Router();

router.get('/', authenticate, leaderboardController.getLeaderboard);
router.get('/timeline', authenticate, leaderboardController.getTimeline);

module.exports = router;
