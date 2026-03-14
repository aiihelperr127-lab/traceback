const { db } = require('../config/firebase');
const { COLLECTIONS } = require('shared');

const submissionsRef = db.collection(COLLECTIONS.SUBMISSIONS);

async function hasTeamSolved(teamId, challengeId) {
  const snapshot = await submissionsRef
    .where('teamId', '==', teamId)
    .where('challengeId', '==', challengeId)
    .where('correct', '==', true)
    .limit(1)
    .get();
  return !snapshot.empty;
}

async function create({ userId, teamId, challengeId, flag, correct }) {
  const ref = await submissionsRef.add({
    userId, teamId, challengeId, flag, correct,
    timestamp: new Date().toISOString(),
  });
  return ref.id;
}

async function getRecent(limit = 50) {
  const snapshot = await submissionsRef.orderBy('timestamp', 'desc').limit(limit).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getCount() {
  const snapshot = await submissionsRef.count().get();
  return snapshot.data().count;
}

async function getCorrectCount() {
  const snapshot = await submissionsRef.where('correct', '==', true).count().get();
  return snapshot.data().count;
}

async function getCorrectSubmissions() {
  const snapshot = await submissionsRef
    .where('correct', '==', true)
    .orderBy('timestamp', 'asc')
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

module.exports = { hasTeamSolved, create, getRecent, getCount, getCorrectCount, getCorrectSubmissions };
