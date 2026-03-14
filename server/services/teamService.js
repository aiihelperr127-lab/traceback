const { db } = require('../config/firebase');
const { COLLECTIONS } = require('shared');
const { FieldValue } = require('firebase-admin/firestore');
const crypto = require('crypto');

const teamsRef = db.collection(COLLECTIONS.TEAMS);
const usersRef = db.collection(COLLECTIONS.USERS);

function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function create(teamName, captainId, captainUsername) {
  const inviteCode = generateInviteCode();
  const teamRef = teamsRef.doc();
  const teamId = teamRef.id;

  await db.runTransaction(async (txn) => {
    const userDoc = await txn.get(usersRef.doc(captainId));
    if (!userDoc.exists) throw new Error('User not found');
    if (userDoc.data().teamId) throw new Error('You are already on a team');

    txn.set(teamRef, {
      teamName,
      captainId,
      members: [{ uid: captainId, username: captainUsername }],
      inviteCode,
      score: 0,
      lastSolveTime: null,
      createdAt: new Date().toISOString(),
    });
    txn.update(usersRef.doc(captainId), { teamId });
  });

  return teamId;
}

async function join(teamId, userId, username, maxSize) {
  await db.runTransaction(async (txn) => {
    const teamDoc = await txn.get(teamsRef.doc(teamId));
    if (!teamDoc.exists) throw new Error('Team not found');

    const team = teamDoc.data();
    if (team.members.length >= maxSize) throw new Error(`Team is full (max ${maxSize} members)`);

    const userDoc = await txn.get(usersRef.doc(userId));
    if (!userDoc.exists) throw new Error('User not found');
    if (userDoc.data().teamId) throw new Error('You are already on a team');

    if (team.members.some((m) => m.uid === userId)) throw new Error('Already a member');

    txn.update(teamsRef.doc(teamId), {
      members: FieldValue.arrayUnion({ uid: userId, username }),
    });
    txn.update(usersRef.doc(userId), { teamId });
  });
}

async function findByInviteCode(code) {
  const snapshot = await teamsRef.where('inviteCode', '==', code.toUpperCase()).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function leave(teamId, userId) {
  await db.runTransaction(async (txn) => {
    const teamDoc = await txn.get(teamsRef.doc(teamId));
    if (!teamDoc.exists) throw new Error('Team not found');

    const team = teamDoc.data();
    const member = team.members.find((m) => m.uid === userId);
    if (!member) throw new Error('Not a member of this team');

    const remaining = team.members.filter((m) => m.uid !== userId);

    if (remaining.length === 0) {
      txn.delete(teamsRef.doc(teamId));
    } else {
      const updates = { members: remaining };
      if (team.captainId === userId) {
        updates.captainId = remaining[0].uid;
      }
      txn.update(teamsRef.doc(teamId), updates);
    }

    txn.update(usersRef.doc(userId), { teamId: null });
  });
}

async function kickMember(teamId, userId) {
  await leave(teamId, userId);
}

async function remove(teamId) {
  await db.runTransaction(async (txn) => {
    const teamDoc = await txn.get(teamsRef.doc(teamId));
    if (!teamDoc.exists) throw new Error('Team not found');
    const team = teamDoc.data();
    for (const m of team.members) {
      txn.update(usersRef.doc(m.uid), { teamId: null });
    }
    txn.delete(teamsRef.doc(teamId));
  });
}

async function addScore(teamId, points) {
  await teamsRef.doc(teamId).update({
    score: FieldValue.increment(points),
    lastSolveTime: new Date().toISOString(),
  });
}

async function setScore(teamId, score) {
  await teamsRef.doc(teamId).update({ score: Number(score) });
}

async function getLeaderboard() {
  const snapshot = await teamsRef.orderBy('score', 'desc').orderBy('lastSolveTime', 'asc').get();
  return snapshot.docs.map((doc, index) => ({
    rank: index + 1, id: doc.id, ...doc.data(),
  }));
}

async function getAll() {
  const snapshot = await teamsRef.orderBy('score', 'desc').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getById(teamId) {
  const doc = await teamsRef.doc(teamId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function getCount() {
  const snapshot = await teamsRef.count().get();
  return snapshot.data().count;
}

module.exports = {
  create, join, findByInviteCode, leave, kickMember, remove,
  addScore, setScore, getLeaderboard, getAll, getById, getCount,
  generateInviteCode,
};
