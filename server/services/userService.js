const { db } = require('../config/firebase');
const { COLLECTIONS } = require('shared');

const usersRef = db.collection(COLLECTIONS.USERS);

async function getAll() {
  const snapshot = await usersRef.orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getById(uid) {
  const doc = await usersRef.doc(uid).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function update(uid, data) {
  await usersRef.doc(uid).update(data);
}

async function getCount() {
  const snapshot = await usersRef.count().get();
  return snapshot.data().count;
}

module.exports = { getAll, getById, update, getCount };
