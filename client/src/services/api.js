import { auth } from '../config/firebase';

function normalizeBase(url) {
  if (!url || url === '/api') return url || '/api';
  return url.replace(/\/+$/, '');
}

const API_URL = normalizeBase(import.meta.env.VITE_API_URL || '/api');

/** @param {boolean} forceRefresh - true after 401 so Firebase mints a new ID token */
async function getToken(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken(forceRefresh);
}

async function parseJsonSafe(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: `Invalid response (${res.status})` };
  }
}

async function request(endpoint, options = {}, retried = false) {
  const token = await getToken(retried);
  let res;
  try {
    res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch (e) {
    throw new Error(
      e?.message?.includes('fetch')
        ? 'Network error — check connection and API URL (VITE_API_URL).'
        : e?.message || 'Request failed'
    );
  }
  const data = await parseJsonSafe(res);
  if (res.status === 401 && (data.error || '').includes('Invalid or expired') && !retried) {
    return request(endpoint, options, true);
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function uploadFiles(files, retried = false) {
  const token = await getToken(retried);
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  let res;
  try {
    res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  } catch (e) {
    throw new Error(
      e?.message?.includes('fetch') ? 'Upload failed: network error.' : e?.message || 'Upload failed'
    );
  }
  const data = await parseJsonSafe(res);
  if (res.status === 401 && (data.error || '').includes('Invalid or expired') && !retried) {
    return uploadFiles(files, true);
  }
  if (!res.ok) {
    const err = new Error(data.error || `Upload failed (${res.status})`);
    err.code = data.code;
    throw err;
  }
  return data;
}

export const api = {
  getChallenges: () => request('/challenges'),
  getChallenge: (id) => request(`/challenges/${id}`),
  submitFlag: (challengeId, flag) =>
    request('/submit-flag', {
      method: 'POST',
      body: JSON.stringify({ challengeId, flag }),
    }),
  requestHint: (challengeId) =>
    request(`/challenges/${challengeId}/hint`, { method: 'POST' }),
  getLeaderboard: () => request('/leaderboard'),
  getTimeline: () => request('/leaderboard/timeline'),
  getProfile: () => request('/auth/profile'),
  register: (username, email) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email }),
    }),
  getAnnouncements: () => request('/announcements'),
  getTimer: () => request('/timer'),
  getMyTeam: () => request('/teams/mine'),
  createTeam: (teamName) =>
    request('/teams/create', { method: 'POST', body: JSON.stringify({ teamName }) }),
  joinTeam: (inviteCode) =>
    request('/teams/join', { method: 'POST', body: JSON.stringify({ inviteCode }) }),
  leaveTeam: () => request('/teams/leave', { method: 'POST' }),
};

export const adminApi = {
  uploadFiles,
  getStats: () => request('/admin/stats'),

  listChallenges: () => request('/admin/challenges'),
  getChallenge: (id) => request(`/admin/challenges/${id}`),
  createChallenge: (data) =>
    request('/admin/challenges', { method: 'POST', body: JSON.stringify(data) }),
  updateChallenge: (id, data) =>
    request(`/admin/challenges/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleChallenge: (id, isActive) =>
    request(`/admin/challenges/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  deleteChallenge: (id) => request(`/admin/challenges/${id}`, { method: 'DELETE' }),
  duplicateChallenge: (id) => request(`/admin/challenges/${id}/duplicate`, { method: 'POST' }),

  listUsers: () => request('/admin/users'),
  updateUser: (uid, data) =>
    request(`/admin/users/${uid}`, { method: 'PUT', body: JSON.stringify(data) }),

  listTeams: () => request('/admin/teams'),
  updateTeam: (id, data) =>
    request(`/admin/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTeam: (id) => request(`/admin/teams/${id}`, { method: 'DELETE' }),
  kickMember: (teamId, uid) =>
    request(`/admin/teams/${teamId}/kick`, {
      method: 'POST',
      body: JSON.stringify({ uid }),
    }),

  listSubmissions: (limit = 50) => request(`/admin/submissions?limit=${limit}`),

  getEvent: () => request('/admin/event'),
  timerAction: (data) => request('/admin/event', { method: 'PUT', body: JSON.stringify(data) }),

  listAnnouncements: () => request('/admin/announcements'),
  createAnnouncement: (data) =>
    request('/admin/announcements', { method: 'POST', body: JSON.stringify(data) }),
  updateAnnouncement: (id, data) =>
    request(`/admin/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAnnouncement: (id) =>
    request(`/admin/announcements/${id}`, { method: 'DELETE' }),

  getSettings: () => request('/admin/settings'),
  updateSettings: (data) =>
    request('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),
};
