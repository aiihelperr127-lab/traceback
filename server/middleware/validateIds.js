/** Firestore auto-ids are URL-safe ~20 chars */
const ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;
const FLAG_MAX = 512;

function isValidId(id) {
  return typeof id === 'string' && ID_RE.test(id);
}

function requireChallengeId(req, res, next) {
  const id = req.params.id || req.body.challengeId;
  if (id !== undefined && id !== null && !isValidId(String(id))) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  next();
}

function sanitizeFlag(flag) {
  if (typeof flag !== 'string') return '';
  const t = flag.trim();
  if (t.length > FLAG_MAX) return null;
  return t;
}

module.exports = { isValidId, requireChallengeId, sanitizeFlag, FLAG_MAX };
