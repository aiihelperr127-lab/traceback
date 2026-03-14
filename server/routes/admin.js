const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');
const admin = require('../controllers/adminController');

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/stats', admin.getStats);

router.get('/challenges', admin.listChallenges);
router.get('/challenges/:id', admin.getChallenge);
router.post('/challenges', admin.createChallenge);
router.put('/challenges/:id', admin.updateChallenge);
router.patch('/challenges/:id/toggle', admin.toggleChallenge);
router.delete('/challenges/:id', admin.deleteChallenge);
router.post('/challenges/:id/duplicate', admin.duplicateChallenge);

router.get('/users', admin.listUsers);
router.put('/users/:uid', admin.updateUser);

router.get('/teams', admin.listTeams);
router.put('/teams/:id', admin.updateTeam);
router.delete('/teams/:id', admin.deleteTeam);
router.post('/teams/:id/kick', admin.kickMember);

router.get('/submissions', admin.listSubmissions);

router.get('/event', admin.getEvent);
router.put('/event', admin.updateEvent);

router.get('/announcements', admin.listAnnouncements);
router.post('/announcements', admin.createAnnouncement);
router.put('/announcements/:id', admin.updateAnnouncement);
router.delete('/announcements/:id', admin.deleteAnnouncement);

router.get('/settings', admin.getSettings);
router.put('/settings', admin.updateSettings);

module.exports = router;
