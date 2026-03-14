const rateLimit = require('express-rate-limit');

const isProd = process.env.NODE_ENV === 'production';

/** Trust first proxy (Nginx) so rate limits use real client IP */
function trustProxy(app) {
  if (isProd) app.set('trust proxy', 1);
}

function parseOrigins() {
  const raw = process.env.CORS_ORIGINS || '';
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (list.length) return list;
  return null;
}

function corsOptions() {
  const origins = parseOrigins();
  return {
    origin(orig, cb) {
      if (!origins) return cb(null, true);
      if (!orig) return cb(null, true);
      if (origins.includes(orig)) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
    maxAge: 86400,
  };
}

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 120 : 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again shortly.' },
});

const submitFlagLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.uid || req.ip,
  message: { error: 'Too many flag attempts. Wait before trying again.' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests.' },
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests.' },
});

module.exports = {
  trustProxy,
  corsOptions,
  globalLimiter,
  submitFlagLimiter,
  authLimiter,
  adminLimiter,
};
