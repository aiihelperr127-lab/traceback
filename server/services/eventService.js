const { db } = require('../config/firebase');
const { COLLECTIONS } = require('shared');

const eventsRef = db.collection(COLLECTIONS.EVENTS);
const SINGLETON_ID = 'current';

async function getActiveEvent() {
  const doc = await eventsRef.doc(SINGLETON_ID).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function updateEvent(data) {
  await eventsRef.doc(SINGLETON_ID).set(data, { merge: true });
}

function computeTimerState(event) {
  if (!event) return { status: 'idle', remaining: 0 };
  const { status, duration, startedAt, elapsed } = event;
  const dur = duration || 0;
  const prev = elapsed || 0;

  if (status === 'running' && startedAt) {
    const nowMs = Date.now();
    const startMs = new Date(startedAt).getTime();
    const runningFor = Math.floor((nowMs - startMs) / 1000);
    const totalElapsed = prev + runningFor;
    const remaining = Math.max(0, dur - totalElapsed);
    if (remaining <= 0) return { status: 'ended', remaining: 0 };
    return { status: 'running', remaining };
  }

  if (status === 'paused') {
    return { status: 'paused', remaining: Math.max(0, dur - prev) };
  }

  if (status === 'ended') {
    return { status: 'ended', remaining: 0 };
  }

  return { status: 'idle', remaining: dur };
}

module.exports = { getActiveEvent, updateEvent, computeTimerState };
