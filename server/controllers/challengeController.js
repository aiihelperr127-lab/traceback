const challengeService = require('../services/challengeService');
const hintService = require('../services/hintService');
const submissionService = require('../services/submissionService');
const teamService = require('../services/teamService');
const { HINT_PENALTY } = require('shared');

/** Normalize files + sourceUrl into a single list for players. */
function buildAttachments(challenge) {
  const out = [];
  const seen = new Set();
  const push = (url, name, kind) => {
    if (!url || typeof url !== 'string') return;
    const u = url.trim();
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push({
      url: u,
      name: name || 'Link',
      kind: kind || (u.startsWith('http') ? 'link' : 'file'),
    });
  };

  let files = challenge.files;
  if (!Array.isArray(files) && files && typeof files === 'object') {
    files = Object.values(files);
  }
  if (!Array.isArray(files)) files = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (typeof f === 'string') push(f, `Attachment ${i + 1}`, 'file');
    else if (f && typeof f === 'object' && f.url) push(f.url, f.name || `File ${i + 1}`, 'file');
  }

  return out;
}

async function getAll(req, res, next) {
  try {
    const challenges = await challengeService.getAllActive();

    const teamId = req.userProfile?.teamId;
    let usageMap = {};
    if (teamId) {
      const checks = await Promise.all(
        challenges.map((c) =>
          hintService.getHintUsage(teamId, c.id).then((u) => [c.id, u])
        )
      );
      for (const [cid, usage] of checks) { usageMap[cid] = usage; }
    }

    const enriched = (Array.isArray(challenges) ? challenges : []).map((c) => {
      const usage = usageMap[c?.id];
      const totalHints = Array.isArray(c?.hints) ? c.hints.length : 0;
      const revealed = usage ? usage.hintsRevealed : 0;
      return {
        ...c,
        hints: undefined,
        hintUsed: revealed > 0,
        hintsRevealed: revealed,
        totalHints,
        hasHints: totalHints > 0,
        hintPenalty: (c && HINT_PENALTY[c.difficulty]) ?? 0.5,
      };
    });

    res.json({ challenges: enriched });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const challenge = await challengeService.getById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const teamId = req.userProfile?.teamId;
    const allHints = challenge.hints || [];
    const totalHints = allHints.length;
    let revealed = 0;

    if (teamId) {
      const usage = await hintService.getHintUsage(teamId, challenge.id);
      if (usage) revealed = usage.hintsRevealed || 0;
    }

    const visibleHints = allHints.slice(0, revealed);
    const attachments = buildAttachments(challenge);

    const correctSubs = (await submissionService.getCorrectSubmissions()).filter(
      (s) => s.challengeId === challenge.id
    );
    const teamIds = [...new Set(correctSubs.map((s) => s.teamId).filter(Boolean))];
    const teamMap = {};
    await Promise.all(
      teamIds.map(async (tid) => {
        const t = await teamService.getById(tid);
        if (t) teamMap[tid] = t.teamName || tid;
      })
    );
    const solves = correctSubs.map((s) => ({
      teamName: teamMap[s.teamId] || s.teamId || 'Team',
      at: s.timestamp,
    }));

    res.json({
      challenge: {
        ...challenge,
        hints: visibleHints,
        hintsRevealed: revealed,
        totalHints,
        hintUsed: revealed > 0,
        hasHints: totalHints > 0,
        hintPenalty: (challenge && HINT_PENALTY[challenge.difficulty]) ?? 0.5,
        attachments,
        solves,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function requestHint(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const teamId = req.userProfile?.teamId;

    if (!teamId) {
      return res.status(400).json({ error: 'You must be on a team to request hints' });
    }

    const challenge = await challengeService.getById(id);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const allHints = challenge.hints || [];
    if (allHints.length === 0) {
      return res.status(400).json({ error: 'No hints available for this challenge' });
    }

    const usage = await hintService.getHintUsage(teamId, id);
    const currentRevealed = usage ? (usage.hintsRevealed || 0) : 0;

    if (currentRevealed >= allHints.length) {
      return res.json({
        hints: allHints,
        hintsRevealed: currentRevealed,
        totalHints: allHints.length,
        allRevealed: true,
      });
    }

    const result = await hintService.revealNextHint(teamId, id, userId, allHints.length);
    const visibleHints = allHints.slice(0, result.revealed);

    const penalty = (challenge && HINT_PENALTY[challenge.difficulty]) ?? 0.5;
    const response = {
      hints: visibleHints,
      hintsRevealed: result.revealed,
      totalHints: allHints.length,
      isFirst: result.isFirst,
    };

    if (result.isFirst) {
      const pointsLost = Math.floor(challenge.points * penalty);
      response.penalty = pointsLost;
      response.effectivePoints = challenge.points - pointsLost;
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, requestHint };
