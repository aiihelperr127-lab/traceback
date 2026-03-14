const { db } = require('../config/firebase');
const { COLLECTIONS } = require('shared');

const ref = db.collection(COLLECTIONS.ANNOUNCEMENTS);

async function getAll() {
  const snapshot = await ref.orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getActive() {
  const snapshot = await ref
    .where('active', '==', true)
    .orderBy('createdAt', 'desc')
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function create({ title, body, type, active }) {
  const doc = await ref.add({
    title,
    body: body || '',
    type: type || 'info',
    active: active !== false,
    createdAt: new Date().toISOString(),
  });
  return doc.id;
}

async function update(id, data) {
  await ref.doc(id).update(data);
}

async function remove(id) {
  await ref.doc(id).delete();
}

module.exports = { getAll, getActive, create, update, remove };
