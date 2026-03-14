const { db } = require('../config/firebase');
const { COLLECTIONS, ROLES } = require('shared');

const USERNAME_MAX = 32;
const EMAIL_MAX = 254;

async function register(req, res, next) {
  try {
    const uid = req.user.uid;
    const username = String(req.body?.username || '').trim();
    const email = String(req.body?.email || '').trim();

    if (!username || username.length < 2 || username.length > USERNAME_MAX) {
      return res.status(400).json({ error: 'username must be 2–32 characters' });
    }
    if (!/^[\w.-]+$/.test(username)) {
      return res.status(400).json({ error: 'username: letters, numbers, ._- only' });
    }
    if (!email || email.length > EMAIL_MAX || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'valid email required' });
    }

    const existing = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (existing.exists) {
      return res.status(409).json({ error: 'User already registered' });
    }

    await db.collection(COLLECTIONS.USERS).doc(uid).set({
      uid,
      username,
      email,
      teamId: null,
      role: ROLES.PLAYER,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    const uid = req.user.uid;
    const doc = await db.collection(COLLECTIONS.USERS).doc(uid).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ profile: { id: doc.id, ...doc.data() } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, getProfile };
