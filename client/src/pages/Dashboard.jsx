import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Timer from '../components/Timer';

export default function Dashboard() {
  const { profile, refreshProfile } = useAuth();

  return (
    <div className="page">
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, <span className="mono" style={{ color: 'var(--c-cyan)' }}>{profile?.username || 'player'}</span>
          </p>
        </div>

        <div className="dash-grid animate-in">
          <div className="card dash-card" style={{ gridColumn: 'span 2' }}>
            <TeamSection profile={profile} refreshProfile={refreshProfile} />
          </div>
          <div className="card dash-card" style={{ display: 'flex', justifyContent: 'center' }}>
            <Timer />
          </div>
        </div>

        <div className="card animate-in" style={{ marginTop: '2rem', animationDelay: '0.1s' }}>
          <div className="dash-card-title" style={{ marginBottom: '1rem', color: 'var(--c-text-2)' }}>Quick Actions</div>
          <div className="dash-links">
            <Link to="/challenges" className="btn btn-primary btn-sm">Browse Challenges</Link>
            <Link to="/leaderboard" className="btn btn-ghost btn-sm">Leaderboard</Link>
            <Link to="/profile" className="btn btn-ghost btn-sm">Edit Profile</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamSection({ profile, refreshProfile }) {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('idle');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadTeam();
  }, [profile?.teamId]);

  async function loadTeam() {
    setLoading(true);
    try {
      const { team: t } = await api.getMyTeam();
      setTeam(t);
    } catch { setTeam(null); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setError(''); setBusy(true);
    try {
      await api.createTeam(teamName.trim());
      await refreshProfile();
      await loadTeam();
      setView('idle');
      setTeamName('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setError(''); setBusy(true);
    try {
      await api.joinTeam(inviteCode.trim());
      await refreshProfile();
      await loadTeam();
      setView('idle');
      setInviteCode('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function handleLeave() {
    if (!window.confirm('Leave this team? If you are the last member, the team will be deleted.')) return;
    setError(''); setBusy(true);
    try {
      await api.leaveTeam();
      await refreshProfile();
      setTeam(null);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function copyCode() {
    navigator.clipboard.writeText(team.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (team) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="dash-card-title" style={{ color: 'var(--c-text-2)' }}>Your Team</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--c-text-0)', marginTop: '0.4rem', letterSpacing: '-0.02em' }}>
          {team.teamName}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1.5rem', flex: 1 }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Score</div>
            <div className="mono" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--c-cyan)', textShadow: '0 0 16px var(--c-cyan-dim)', marginTop: '0.2rem' }}>{team.score || 0}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Members</div>
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {team.members.map((m) => (
                <div key={m.uid} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--c-text-1)' }}>{m.username}</span>
                  {m.uid === team.captainId && (
                    <span style={{ fontSize: '0.65rem', background: 'var(--c-cyan-dim)', color: 'var(--c-cyan)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', border: '1px solid rgba(6,182,212,0.2)' }}>Captain</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(15,23,42,0.4)', borderRadius: '8px', border: '1px solid var(--c-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.5rem' }}>Invite Code</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <code className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--c-text-0)' }}>{team.inviteCode}</code>
            <button className="btn btn-ghost btn-sm" onClick={copyCode} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--c-text-3)', fontStyle: 'italic', marginTop: '0.4rem' }}>Share this code with your teammate to join.</div>
        </div>

        {error && <div className="form-error" style={{ marginTop: '0.75rem' }}>{error}</div>}

        <div style={{ marginTop: '1rem' }}>
          <button className="btn btn-danger btn-sm" onClick={handleLeave} disabled={busy}>
            {busy ? 'Leaving...' : 'Leave Team'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="dash-card-title">Your Team</div>
      <p style={{ color: 'var(--c-text-3)', fontSize: '0.9rem', marginTop: '0.25rem', marginBottom: '1rem' }}>
        You are not on a team. Create one or join with an invite code.
      </p>

      {error && <div className="form-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

      {view === 'idle' && (
        <div className="flex gap-sm">
          <button className="btn btn-primary btn-sm" onClick={() => { setView('create'); setError(''); }}>Create Team</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setView('join'); setError(''); }}>Join Team</button>
        </div>
      )}

      {view === 'create' && (
        <form onSubmit={handleCreate} style={{ maxWidth: 340 }}>
          <div className="field">
            <label className="field-label">Team Name</label>
            <input
              className="input"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter a team name"
              minLength={2}
              maxLength={30}
              autoFocus
              required
            />
          </div>
          <div className="flex gap-sm" style={{ marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Creating...' : 'Create'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setView('idle'); setError(''); }}>Cancel</button>
          </div>
        </form>
      )}

      {view === 'join' && (
        <form onSubmit={handleJoin} style={{ maxWidth: 340 }}>
          <div className="field">
            <label className="field-label">Invite Code</label>
            <input
              className="input mono"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. A1B2C3D4"
              style={{ letterSpacing: '0.15em', fontWeight: 600 }}
              autoFocus
              required
            />
          </div>
          <div className="flex gap-sm" style={{ marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Joining...' : 'Join'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setView('idle'); setError(''); }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
