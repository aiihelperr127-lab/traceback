const { db } = require('../config/firebase');
const { COLLECTIONS } = require('shared');
const { FieldValue } = require('firebase-admin/firestore');

const challengesRef = db.collection(COLLECTIONS.CHALLENGES);

async function getAllActive() {
  const snapshot = await challengesRef.where('isActive', '==', true).get();
  return snapshot.docs.map((doc) => {
    const { flag, ...safe } = doc.data();
    return { id: doc.id, ...safe };
  });
}

async function getAll() {
  const snapshot = await challengesRef.orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getById(id) {
  const doc = await challengesRef.doc(id).get();
  if (!doc.exists) return null;
  const { flag, ...safe } = doc.data();
  return { id: doc.id, ...safe };
}

async function getByIdWithFlag(id) {
  const doc = await challengesRef.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function create(data) {
  const ref = await challengesRef.add({
    ...data,
    solveCount: 0,
    isActive: data.isActive ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return ref.id;
}

async function update(id, data) {
  await challengesRef.doc(id).update({
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

async function remove(id) {
  await challengesRef.doc(id).delete();
}

async function incrementSolveCount(id) {
  await challengesRef.doc(id).update({ solveCount: FieldValue.increment(1) });
}

async function getCount() {
  const snapshot = await challengesRef.count().get();
  return snapshot.data().count;
}

async function getActiveCount() {
  const snapshot = await challengesRef.where('isActive', '==', true).count().get();
  return snapshot.data().count;
}

module.exports = {
  getAllActive, getAll, getById, getByIdWithFlag,
  create, update, remove, incrementSolveCount,
  getCount, getActiveCount,
};
