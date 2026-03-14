const teamService = require('../services/teamService');
const settingsService = require('../services/settingsService');

async function createTeam(req, res, next) {
  try {
    const { teamName } = req.body;
    if (!teamName || teamName.trim().length < 2 || teamName.trim().length > 30) {
      return res.status(400).json({ error: 'Team name must be 2-30 characters' });
    }

    const uid = req.user.uid;
    const username = req.userProfile?.username || 'Unknown';

    if (req.userProfile?.teamId) {
      return res.status(400).json({ error: 'You are already on a team' });
    }

    const teamId = await teamService.create(teamName.trim(), uid, username);
    res.status(201).json({ teamId, message: 'Team created' });
  } catch (err) {
    if (err.message.includes('already on a team')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

async function joinTeam(req, res, next) {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const uid = req.user.uid;
    const username = req.userProfile?.username || 'Unknown';

    if (req.userProfile?.teamId) {
      return res.status(400).json({ error: 'You are already on a team. Leave your current team first.' });
    }

    const team = await teamService.findByInviteCode(inviteCode.trim());
    if (!team) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const settings = await settingsService.get();
    const maxSize = settings.maxTeamSize || 2;

    if (team.members.length >= maxSize) {
      return res.status(400).json({ error: `Team is full (max ${maxSize} members)` });
    }

    await teamService.join(team.id, uid, username, maxSize);
    res.json({ teamId: team.id, message: 'Joined team successfully' });
  } catch (err) {
    if (err.message.includes('already') || err.message.includes('full') || err.message.includes('not found')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

async function leaveTeam(req, res, next) {
  try {
    const uid = req.user.uid;
    const teamId = req.userProfile?.teamId;

    if (!teamId) {
      return res.status(400).json({ error: 'You are not on a team' });
    }

    await teamService.leave(teamId, uid);
    res.json({ message: 'Left team successfully' });
  } catch (err) {
    next(err);
  }
}

async function getMyTeam(req, res, next) {
  try {
    const teamId = req.userProfile?.teamId;
    if (!teamId) {
      return res.json({ team: null });
    }

    const team = await teamService.getById(teamId);
    if (!team) {
      return res.json({ team: null });
    }

    res.json({
      team: {
        id: team.id,
        teamName: team.teamName,
        captainId: team.captainId,
        members: team.members,
        inviteCode: team.inviteCode,
        score: team.score || 0,
        createdAt: team.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createTeam, joinTeam, leaveTeam, getMyTeam };
