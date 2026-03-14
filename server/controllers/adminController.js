const challengeService = require('../services/challengeService');
const eventService = require('../services/eventService');
const submissionService = require('../services/submissionService');
const teamService = require('../services/teamService');
const userService = require('../services/userService');
const announcementService = require('../services/announcementService');
const settingsService = require('../services/settingsService');

// ─── Stats ──────────────────────────────────────────

async function getStats(_req, res, next) {
  try {
    const [challenges, activeChallenges, teams, users, submissions, correctSolves] =
      await Promise.all([
        challengeService.getCount(),
        challengeService.getActiveCount(),
        teamService.getCount(),
        userService.getCount(),
        submissionService.getCount(),
        submissionService.getCorrectCount(),
      ]);

    const event = await eventService.getActiveEvent();
    const recentSubs = await submissionService.getRecent(10);

    const userIds = [...new Set(recentSubs.map((s) => s.userId).filter(Boolean))];
    const challengeIds = [...new Set(recentSubs.map((s) => s.challengeId).filter(Boolean))];

    const [userDocs, challengeDocs] = await Promise.all([
      Promise.all(userIds.map((id) => userService.getById(id))),
      Promise.all(challengeIds.map((id) => challengeService.getById(id))),
    ]);

    const userMap = {};
    for (const u of userDocs) { if (u) userMap[u.id] = u.username || u.email || u.id; }
    const challengeMap = {};
    for (const c of challengeDocs) { if (c) challengeMap[c.id] = c.title || c.id; }

    const enrichedSubs = recentSubs.map((s) => ({
      ...s,
      username: userMap[s.userId] || s.userId,
      challengeTitle: challengeMap[s.challengeId] || s.challengeId,
    }));

    res.json({
      stats: {
        challenges, activeChallenges, teams, users,
        submissions, correctSolves,
        eventActive: event?.isActive || false,
      },
      recentActivity: enrichedSubs,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Challenges ─────────────────────────────────────

async function listChallenges(_req, res, next) {
  try {
    const challenges = await challengeService.getAll();
    res.json({ challenges });
  } catch (err) {
    next(err);
  }
}

async function getChallenge(req, res, next) {
  try {
    const challenge = await challengeService.getByIdWithFlag(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    res.json({ challenge });
  } catch (err) {
    next(err);
  }
}

async function createChallenge(req, res, next) {
  try {
    const {
      title, category, difficulty, points, description, flag,
      files, hints, author, sourceUrl, isActive, tags,
    } = req.body;

    if (!title || !category || !difficulty || !points || !flag) {
      return res.status(400).json({ error: 'title, category, difficulty, points, and flag are required' });
    }

    const id = await challengeService.create({
      title, category, difficulty,
      points: Number(points),
      description: description || '',
      flag,
      files: files || [],
      hints: hints || [],
      tags: tags || [],
      author: author || '',
      sourceUrl: sourceUrl || '',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({ id, message: 'Challenge created' });
  } catch (err) {
    next(err);
  }
}

async function updateChallenge(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await challengeService.getByIdWithFlag(id);
    if (!existing) return res.status(404).json({ error: 'Challenge not found' });

    const allowed = [
      'title', 'category', 'difficulty', 'points', 'description',
      'flag', 'files', 'hints', 'tags', 'author', 'sourceUrl', 'isActive',
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = key === 'points' ? Number(req.body[key])
          : key === 'isActive' ? Boolean(req.body[key])
          : req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await challengeService.update(id, updates);
    res.json({ message: 'Challenge updated' });
  } catch (err) {
    next(err);
  }
}

async function toggleChallenge(req, res, next) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    await challengeService.update(id, { isActive: Boolean(isActive) });
    res.json({ message: `Challenge ${isActive ? 'enabled' : 'disabled'}` });
  } catch (err) {
    next(err);
  }
}

async function deleteChallenge(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await challengeService.getByIdWithFlag(id);
    if (!existing) return res.status(404).json({ error: 'Challenge not found' });
    await challengeService.remove(id);
    res.json({ message: 'Challenge deleted' });
  } catch (err) {
    next(err);
  }
}

async function duplicateChallenge(req, res, next) {
  try {
    const { id } = req.params;
    const source = await challengeService.getByIdWithFlag(id);
    if (!source) return res.status(404).json({ error: 'Challenge not found' });

    const { id: _sid, solveCount: _sc, createdAt: _ca, updatedAt: _ua, ...rest } = source;
    const newId = await challengeService.create({
      ...rest,
      title: `${rest.title} (copy)`,
      isActive: false,
    });

    res.status(201).json({ id: newId, message: 'Challenge duplicated' });
  } catch (err) {
    next(err);
  }
}

// ─── Users ──────────────────────────────────────────

async function listUsers(_req, res, next) {
  try {
    const [users, teams] = await Promise.all([
      userService.getAll(),
      teamService.getAll(),
    ]);
    const teamMap = {};
    for (const t of teams) {
      teamMap[t.id] = { teamName: t.teamName, score: t.score ?? 0 };
    }
    const enriched = users.map((u) => ({
      ...u,
      teamName: u.teamId ? teamMap[u.teamId]?.teamName || null : null,
      teamScore: u.teamId ? teamMap[u.teamId]?.score ?? 0 : null,
    }));
    res.json({ users: enriched });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { uid } = req.params;
    const { ROLES } = require('shared');
    const { role, teamId, banned } = req.body;
    const updates = {};
    if (role !== undefined) {
      if (role !== ROLES.PLAYER && role !== ROLES.ADMIN) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.role = role;
    }
    if (teamId !== undefined) updates.teamId = teamId || null;
    if (banned !== undefined) updates.banned = Boolean(banned);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await userService.update(uid, updates);
    res.json({ message: 'User updated' });
  } catch (err) {
    next(err);
  }
}

// ─── Teams ──────────────────────────────────────────

async function listTeams(_req, res, next) {
  try {
    const teams = await teamService.getAll();
    res.json({ teams });
  } catch (err) {
    next(err);
  }
}

async function updateTeam(req, res, next) {
  try {
    const { id } = req.params;
    const { score } = req.body;
    if (score === undefined || isNaN(Number(score))) {
      return res.status(400).json({ error: 'Valid score is required' });
    }
    await teamService.setScore(id, Number(score));
    res.json({ message: 'Team score updated' });
  } catch (err) {
    next(err);
  }
}

async function deleteTeam(req, res, next) {
  try {
    await teamService.remove(req.params.id);
    res.json({ message: 'Team deleted' });
  } catch (err) {
    next(err);
  }
}

async function kickMember(req, res, next) {
  try {
    const { id } = req.params;
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'uid is required' });
    await teamService.kickMember(id, uid);
    res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
}

// ─── Submissions ────────────────────────────────────

async function listSubmissions(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const submissions = await submissionService.getRecent(limit);

    const userIds = [...new Set(submissions.map((s) => s.userId).filter(Boolean))];
    const challengeIds = [...new Set(submissions.map((s) => s.challengeId).filter(Boolean))];
    const teamIds = [...new Set(submissions.map((s) => s.teamId).filter(Boolean))];

    const [userDocs, challengeDocs, teamDocs] = await Promise.all([
      Promise.all(userIds.map((id) => userService.getById(id))),
      Promise.all(challengeIds.map((id) => challengeService.getById(id))),
      Promise.all(teamIds.map((id) => teamService.getById(id))),
    ]);

    const userMap = {};
    for (const u of userDocs) { if (u) userMap[u.id] = u.username || u.email || u.id; }
    const challengeMap = {};
    for (const c of challengeDocs) { if (c) challengeMap[c.id] = c.title || c.id; }
    const teamMap = {};
    for (const t of teamDocs) { if (t) teamMap[t.id] = t.teamName || t.id; }

    const enriched = submissions.map((s) => ({
      ...s,
      username: userMap[s.userId] || s.userId,
      challengeTitle: challengeMap[s.challengeId] || s.challengeId,
      teamName: s.teamId ? (teamMap[s.teamId] || s.teamId) : null,
    }));

    res.json({ submissions: enriched });
  } catch (err) {
    next(err);
  }
}

// ─── Event / Timer ──────────────────────────────────

async function getEvent(_req, res, next) {
  try {
    const event = await eventService.getActiveEvent();
    const timer = eventService.computeTimerState(event);
    res.json({ event: { ...(event || {}), ...timer } });
  } catch (err) {
    next(err);
  }
}

async function updateEvent(req, res, next) {
  try {
    const { action, duration, title } = req.body;

    const event = await eventService.getActiveEvent() || {};

    if (action === 'configure') {
      await eventService.updateEvent({
        title: title || event.title || '',
        duration: Number(duration) || event.duration || 0,
        status: event.status || 'idle',
        startedAt: event.startedAt || null,
        elapsed: event.elapsed || 0,
        updatedAt: new Date().toISOString(),
      });
      return res.json({ message: 'Timer configured' });
    }

    if (action === 'start') {
      const dur = Number(duration) || event.duration || 0;
      if (dur <= 0) return res.status(400).json({ error: 'Set a duration before starting' });
      const prev = event.elapsed || 0;
      if (prev >= dur) return res.status(400).json({ error: 'Timer already expired. Reset first.' });
      await eventService.updateEvent({
        title: title || event.title || '',
        duration: dur,
        status: 'running',
        startedAt: new Date().toISOString(),
        elapsed: prev,
        updatedAt: new Date().toISOString(),
      });
      return res.json({ message: 'Timer started' });
    }

    if (action === 'pause') {
      if (event.status !== 'running') return res.status(400).json({ error: 'Timer is not running' });
      const startMs = new Date(event.startedAt).getTime();
      const runSec = Math.floor((Date.now() - startMs) / 1000);
      const totalElapsed = (event.elapsed || 0) + runSec;
      await eventService.updateEvent({
        status: 'paused',
        startedAt: null,
        elapsed: totalElapsed,
        updatedAt: new Date().toISOString(),
      });
      return res.json({ message: 'Timer paused' });
    }

    if (action === 'reset') {
      await eventService.updateEvent({
        title: event.title || '',
        duration: event.duration || 0,
        status: 'idle',
        startedAt: null,
        elapsed: 0,
        updatedAt: new Date().toISOString(),
      });
      return res.json({ message: 'Timer reset' });
    }

    return res.status(400).json({ error: 'Invalid action. Use: configure, start, pause, reset' });
  } catch (err) {
    next(err);
  }
}

// ─── Announcements ──────────────────────────────────

async function listAnnouncements(_req, res, next) {
  try {
    const announcements = await announcementService.getAll();
    res.json({ announcements });
  } catch (err) {
    next(err);
  }
}

async function createAnnouncement(req, res, next) {
  try {
    const { title, body, type, active } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const id = await announcementService.create({ title, body, type, active });
    res.status(201).json({ id, message: 'Announcement created' });
  } catch (err) {
    next(err);
  }
}

async function updateAnnouncement(req, res, next) {
  try {
    const { id } = req.params;
    const { title, body, type, active } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (body !== undefined) updates.body = body;
    if (type !== undefined) updates.type = type;
    if (active !== undefined) updates.active = Boolean(active);
    await announcementService.update(id, updates);
    res.json({ message: 'Announcement updated' });
  } catch (err) {
    next(err);
  }
}

async function deleteAnnouncement(req, res, next) {
  try {
    await announcementService.remove(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    next(err);
  }
}

// ─── Settings ───────────────────────────────────────

async function getSettings(_req, res, next) {
  try {
    const settings = await settingsService.get();
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const { registrationOpen, maxTeamSize, flagFormat, platformName, allowLateJoins } = req.body;
    const updates = {};
    if (registrationOpen !== undefined) updates.registrationOpen = Boolean(registrationOpen);
    if (maxTeamSize !== undefined) updates.maxTeamSize = Math.max(1, Number(maxTeamSize));
    if (flagFormat !== undefined) updates.flagFormat = String(flagFormat);
    if (platformName !== undefined) updates.platformName = String(platformName);
    if (allowLateJoins !== undefined) updates.allowLateJoins = Boolean(allowLateJoins);

    await settingsService.update(updates);
    res.json({ message: 'Settings updated' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStats,
  listChallenges, getChallenge, createChallenge, updateChallenge, toggleChallenge, deleteChallenge, duplicateChallenge,
  listUsers, updateUser,
  listTeams, updateTeam, deleteTeam, kickMember,
  listSubmissions,
  getEvent, updateEvent,
  listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getSettings, updateSettings,
};
