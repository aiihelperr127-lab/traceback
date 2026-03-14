const { db } = require('../config/firebase');
const { COLLECTIONS } = require('shared');

const ref = db.collection(COLLECTIONS.SETTINGS);
const DOC_ID = 'platform';

const DEFAULTS = {
  registrationOpen: true,
  maxTeamSize: 2,
  flagFormat: 'flag{...}',
  platformName: 'TracebackCTF',
  allowLateJoins: true,
};

async function get() {
  const doc = await ref.doc(DOC_ID).get();
  if (!doc.exists) return { ...DEFAULTS };
  return { ...DEFAULTS, ...doc.data() };
}

async function update(data) {
  await ref.doc(DOC_ID).set(data, { merge: true });
}

module.exports = { get, update, DEFAULTS };
