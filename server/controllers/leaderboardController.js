const teamService = require('../services/teamService');
const submissionService = require('../services/submissionService');
const challengeService = require('../services/challengeService');
const hintService = require('../services/hintService');
const { HINT_PENALTY } = require('shared');

const TIMELINE_TOP_N = 15;

async function getLeaderboard(req, res, next) {
  try {
    const [leaderboard, allChallenges, correctSubs] = await Promise.all([
      teamService.getLeaderboard(),
      challengeService.getAll(),
      submissionService.getCorrectSubmissions(),
    ]);

    const totalPoints = allChallenges.reduce((sum, c) => sum + (c.points || 0), 0);
    const totalChallenges = allChallenges.length;

    const solveCounts = {};
    for (const s of correctSubs) {
      solveCounts[s.teamId] = (solveCounts[s.teamId] || 0) + 1;
    }

    const enriched = leaderboard.map((t) => ({
      ...t,
      solveCount: solveCounts[t.id] || 0,
      totalPoints,
      totalChallenges,
    }));

    res.json({ leaderboard: enriched, totalPoints, totalChallenges });
  } catch (err) {
    next(err);
  }
}

/**
 * Timeline = one row per correct flag per top-N team, time-ordered, cumulative score.
 * Matches how submissionController awards points (incl. hint penalty).
 */
async function getTimeline(_req, res, next) {
  try {
    const [leaderboard, correctSubs, challenges, hintedPairs] = await Promise.all([
      teamService.getLeaderboard(),
      submissionService.getCorrectSubmissions(),
      challengeService.getAll(),
      hintService.getHintedPairSet(),
    ]);

    const topTeams = leaderboard.slice(0, TIMELINE_TOP_N);
    const topIds = new Set(topTeams.map((t) => t.id));
    const teamNames = Object.fromEntries(topTeams.map((t) => [t.id, t.teamName]));

    const challengeMap = Object.fromEntries(challenges.map((c) => [c.id, c]));

    const subs = correctSubs
      .filter((s) => s.teamId && topIds.has(s.teamId) && s.challengeId && challengeMap[s.challengeId])
      .sort((a, b) => {
        const ta = new Date(a.timestamp || 0).getTime();
        const tb = new Date(b.timestamp || 0).getTime();
        return ta - tb;
      });

    const cumulative = {};
    const timeline = [];

    for (const sub of subs) {
      const ch = challengeMap[sub.challengeId];
      let pts = ch.points || 0;
      const pairKey = `${sub.teamId}_${sub.challengeId}`;
      if (hintedPairs.has(pairKey)) {
        const pen = HINT_PENALTY[ch.difficulty] || 0.5;
        pts = Math.floor(pts * (1 - pen));
      }
      cumulative[sub.teamId] = (cumulative[sub.teamId] || 0) + pts;
      const ts = sub.timestamp || new Date().toISOString();
      timeline.push({
        teamId: sub.teamId,
        teamName: teamNames[sub.teamId] || sub.teamId,
        score: cumulative[sub.teamId],
        timestamp: ts,
      });
    }

    res.json({
      timeline,
      teams: topTeams.map((t) => ({
        id: t.id,
        teamName: t.teamName,
        score: t.score ?? 0,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getLeaderboard, getTimeline };
