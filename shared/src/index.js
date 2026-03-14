/**
 * Shared constants and schemas for the CTF platform.
 * Used by both client and server packages.
 */

const ROLES = Object.freeze({
  ADMIN: 'admin',
  PLAYER: 'player',
});

const DIFFICULTY = Object.freeze({
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  INSANE: 'insane',
});

const CATEGORIES = Object.freeze([
  'web',
  'pwn',
  'crypto',
  'reversing',
  'forensics',
  'misc',
  'osint',
  'steganography',
]);

const COLLECTIONS = Object.freeze({
  USERS: 'users',
  TEAMS: 'teams',
  CHALLENGES: 'challenges',
  SUBMISSIONS: 'submissions',
  EVENTS: 'events',
  ANNOUNCEMENTS: 'announcements',
  SETTINGS: 'settings',
  HINT_USAGE: 'hint_usage',
});

const HINT_PENALTY = Object.freeze({
  [DIFFICULTY.EASY]: 0.5,
  [DIFFICULTY.MEDIUM]: 0.3,
  [DIFFICULTY.HARD]: 0.2,
  [DIFFICULTY.INSANE]: 0.1,
});

const POINTS_MAP = Object.freeze({
  [DIFFICULTY.EASY]: 100,
  [DIFFICULTY.MEDIUM]: 250,
  [DIFFICULTY.HARD]: 500,
  [DIFFICULTY.INSANE]: 1000,
});

module.exports = {
  ROLES,
  DIFFICULTY,
  CATEGORIES,
  COLLECTIONS,
  POINTS_MAP,
  HINT_PENALTY,
};
