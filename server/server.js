require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');
const {
  trustProxy,
  corsOptions,
  globalLimiter,
  submitFlagLimiter,
  authLimiter,
  adminLimiter,
} = require('./middleware/securityMiddleware');

const authRoutes = require('./routes/auth');
const challengeRoutes = require('./routes/challenges');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');
const teamRoutes = require('./routes/teams');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 4000;

trustProxy(app);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors(corsOptions()));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '256kb' }));
app.use('/api', globalLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const { authenticate } = require('./middleware/authMiddleware');
const announcementService = require('./services/announcementService');
const eventService = require('./services/eventService');
const submissionController = require('./controllers/submissionController');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/challenges', challengeRoutes);
app.post('/api/submit-flag', authenticate, submitFlagLimiter, submissionController.submitFlag);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/upload', adminLimiter, uploadRoutes);

app.get('/api/announcements', authenticate, async (_req, res, next) => {
  try {
    const announcements = await announcementService.getActive();
    res.json({ announcements });
  } catch (err) {
    next(err);
  }
});

app.get('/api/timer', authenticate, async (_req, res, next) => {
  try {
    const event = await eventService.getActiveEvent();
    const timer = eventService.computeTimerState(event);
    res.json({
      title: event?.title || '',
      status: timer.status,
      remaining: timer.remaining,
      duration: event?.duration || 0,
    });
  } catch (err) {
    next(err);
  }
});

const path = require('path');
const clientDist = path.resolve(__dirname, '../client/dist');

app.use(express.static(clientDist));

app.get('*', (_req, res, next) => {
  if (_req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
