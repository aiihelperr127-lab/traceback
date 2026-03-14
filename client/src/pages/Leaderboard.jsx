import { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Distinct hues like typical CTF timeline charts
const CHART_COLORS = [
  '#38bdf8', '#4ade80', '#22c55e', '#a78bfa', '#2563eb',
  '#2dd4bf', '#60a5fa', '#c084fc', '#f472b6', '#fb923c',
  '#facc15', '#34d399', '#f87171', '#818cf8', '#fbbf24',
];

export default function Leaderboard() {
  const { profile } = useAuth();
  const [teams, setTeams] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [chartTeams, setChartTeams] = useState([]);
  const [myTeam, setMyTeam] = useState(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalChallenges, setTotalChallenges] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timelineError, setTimelineError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setTimelineError(null);
      try {
        const lb = await api.getLeaderboard();
        if (cancelled) return;
        setTeams(lb.leaderboard || []);
        setTotalPoints(lb.totalPoints || 0);
        setTotalChallenges(lb.totalChallenges || 0);

        const teamData = profile?.teamId
          ? await api.getMyTeam().catch(() => ({ team: null }))
          : { team: null };
        if (cancelled) return;
        setMyTeam(teamData.team);

        try {
          const tl = await api.getTimeline();
          if (cancelled) return;
          setTimeline(Array.isArray(tl.timeline) ? tl.timeline : []);
          setChartTeams(Array.isArray(tl.teams) ? tl.teams : []);
        } catch (e) {
          if (!cancelled) {
            setTimelineError(e.message || 'Timeline unavailable');
            setTimeline([]);
            setChartTeams((lb.leaderboard || []).slice(0, 15).map((t) => ({ id: t.id, teamName: t.teamName, score: t.score })));
          }
        }
      } catch {
        if (!cancelled) setTeams([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.teamId]);

  if (loading) {
    return (
      <div className="loading-page" style={{ minHeight: '60vh' }}>
        <div className="loading-spinner" />
        <span>Loading leaderboard...</span>
      </div>
    );
  }

  const myRank = profile?.teamId ? teams.findIndex((t) => t.id === profile.teamId) + 1 : 0;
  const solvedCount = myTeam?.score ? teams.find((t) => t.id === profile?.teamId) : null;

  return (
    <div className="page">
      <div className="container">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 className="page-title">Leaderboard</h1>
          <p className="page-subtitle">Teams ranked by score, then by fastest last solve</p>
        </div>

        {chartTeams.length > 0 && (
          <div
            className="card animate-in"
            style={{
              marginBottom: '1.5rem',
              padding: '1.25rem 1.25rem 1rem',
              background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,14,26,0.98) 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
              Timeline for top {chartTeams.length} {chartTeams.length === 1 ? 'team' : 'teams'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--c-text-3)', marginBottom: '0.75rem' }}>
              Cumulative points after each correct submission (same rules as scoring, including hint penalties).
            </div>
            {timelineError && (
              <div className="alert alert-error" style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                {timelineError} — table below still works. Refresh or check API / Firestore indexes.
              </div>
            )}
            <TimelineChart timeline={timeline} chartTeams={chartTeams} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: myTeam ? '1fr 300px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div>
            {teams.length >= 3 && <Podium teams={teams} totalPoints={totalPoints} totalChallenges={totalChallenges} />}

            <div className="card animate-in" style={{ padding: 0, overflow: 'hidden', marginTop: '1.5rem' }}>
              <div style={{ padding: '1rem 1.25rem 0.5rem', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--c-text-3)' }}>
                Top Players
              </div>
              <div className="lb-table-wrap">
                <table className="lb-table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Rank</th>
                      <th>Team</th>
                      <th style={{ width: 100 }}>Solves</th>
                      <th style={{ width: 130 }}>Points</th>
                      <th style={{ width: 180 }}>Last Solve</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((t) => (
                      <tr key={t.id} className={t.rank <= 3 ? ['', 'lb-gold', 'lb-silver', 'lb-bronze'][t.rank] : ''} style={t.id === profile?.teamId ? { background: 'rgba(6,182,212,0.08)' } : undefined}>
                        <td className="lb-rank">#{t.rank}</td>
                        <td className="lb-team">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--c-bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--c-text-3)', flexShrink: 0 }}>
                              {t.teamName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700 }}>{t.teamName}</div>
                              {t.lastSolveTime && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--c-text-3)' }}>
                                  Last Flag at {new Date(t.lastSolveTime).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="mono" style={{ fontSize: '0.85rem', color: 'var(--c-text-2)' }}>
                          {t.solveCount ?? '--'}/{totalChallenges}
                        </td>
                        <td className="lb-score">{t.score ?? 0}</td>
                        <td className="lb-time">
                          {t.lastSolveTime ? new Date(t.lastSolveTime).toLocaleString() : '\u2014'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {myTeam && (
            <div className="card animate-in" style={{ position: 'sticky', top: '5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--c-bg-2)', margin: '0 auto 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'var(--c-cyan)' }}>
                  {myTeam.teamName?.charAt(0).toUpperCase()}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{myTeam.teamName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--c-text-3)', marginTop: '0.2rem' }}>
                  Team Rank: #{myRank || '--'}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--c-text-3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                  Solves: {teams.find((x) => x.id === profile?.teamId)?.solveCount ?? 0}/{totalChallenges || '—'}
                </div>
                <div style={{ height: 8, background: 'var(--c-bg-2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${totalChallenges ? Math.min(100, ((teams.find((x) => x.id === profile?.teamId)?.solveCount ?? 0) / totalChallenges) * 100) : 0}%`,
                      background: 'var(--c-cyan)',
                      borderRadius: 4,
                      transition: 'width 0.5s',
                    }}
                  />
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--c-bg-1)', borderRadius: '6px', border: '1px solid var(--c-border)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--c-text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 0.3rem', display: 'block' }}>
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
                </svg>
                <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--c-cyan)' }}>
                  {myTeam.score ?? 0}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', textTransform: 'uppercase', fontWeight: 600 }}>Points</div>
              </div>

              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--c-text-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid var(--c-border)' }}>
                  <span>Members</span>
                  <span className="mono" style={{ fontWeight: 600, color: 'var(--c-text-2)' }}>{myTeam.members?.length || 0}</span>
                </div>
                {myTeam.members?.map((m) => (
                  <div key={m.uid} style={{ padding: '0.25rem 0', paddingLeft: '0.5rem', fontSize: '0.78rem', color: 'var(--c-text-2)' }}>
                    {m.username} {m.uid === myTeam.captainId && <span style={{ fontSize: '0.65rem', color: 'var(--c-cyan)' }}>(Captain)</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Podium({ teams, totalPoints, totalChallenges }) {
  const top3 = teams.slice(0, 3);
  const order = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const heights = ['120px', '160px', '100px'];
  const colors = ['var(--c-text-2)', 'var(--c-yellow)', 'var(--c-text-3)'];
  const borderColors = ['rgba(148,163,184,0.3)', 'rgba(251,191,36,0.5)', 'rgba(180,83,9,0.3)'];

  return (
    <div className="animate-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '0.75rem', marginBottom: '0.5rem' }}>
      {order.map((t, i) => {
        const isCenter = i === 1;
        return (
          <div key={t.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: isCenter ? 200 : 160 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: colors[i], marginBottom: '0.3rem', padding: '0.15rem 0.6rem', background: `${borderColors[i]}`, borderRadius: '4px' }}>
              #{t.rank}
            </div>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--c-bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700, color: colors[i], border: `2px solid ${borderColors[i]}`, marginBottom: '0.4rem' }}>
              {t.teamName?.charAt(0).toUpperCase()}
            </div>
            <div style={{ fontWeight: 700, fontSize: isCenter ? '1rem' : '0.9rem', fontFamily: 'var(--font-mono)', textAlign: 'center', marginBottom: '0.15rem', color: 'var(--c-text-1)' }}>
              {t.teamName}
            </div>
            <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--c-text-3)' }}>
              {t.score ?? 0} pts
            </div>
          </div>
        );
      })}
    </div>
  );
}

function niceYMax(raw) {
  if (raw <= 0) return 500;
  const exp = Math.floor(Math.log10(raw));
  const step = Math.pow(10, Math.max(0, exp - 1));
  const candidates = [100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];
  for (const c of candidates) if (c >= raw * 1.05) return c;
  return Math.ceil(raw / step) * step;
}

function formatAxisDate(ms) {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function TimelineChart({ timeline, chartTeams }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    function draw() {
      if (!canvasRef.current || !chartTeams.length) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const wrap = wrapRef.current;
      const width = Math.max(wrap?.clientWidth || 700, 400);
      const height = 340;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = width;
      const H = height;
      const PAD_L = 54;
      const PAD_R = 16;
      const PAD_T = 14;
      const PAD_B = 42;
      const plotW = W - PAD_L - PAD_R;
      const plotH = H - PAD_T - PAD_B;
      const bg = '#0c0f14';
      const plotBg = '#12161f';

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = plotBg;
      ctx.fillRect(PAD_L, PAD_T, plotW, plotH);

      const now = Date.now();
      const byTeam = {};
      chartTeams.forEach((t) => { byTeam[t.id] = []; });

      for (const e of timeline || []) {
        if (!e?.teamId || !byTeam[e.teamId]) continue;
        const time = new Date(e.timestamp).getTime();
        if (!Number.isFinite(time)) continue;
        byTeam[e.teamId].push({ time, score: Math.max(0, Number(e.score) || 0), solve: true });
      }

      let firstSolve = Infinity;
      let lastT = now;
      let maxScore = 1;
      Object.values(byTeam).forEach((arr) => {
        arr.sort((a, b) => a.time - b.time);
        const merged = [];
        for (const p of arr) {
          if (merged.length && merged[merged.length - 1].time === p.time) {
            merged[merged.length - 1] = p;
          } else merged.push(p);
        }
        arr.length = 0;
        arr.push(...merged);
        arr.forEach((p) => {
          firstSolve = Math.min(firstSolve, p.time);
          lastT = Math.max(lastT, p.time);
          maxScore = Math.max(maxScore, p.score);
        });
      });

      const padMs = 2 * 3600000;
      let minT = Number.isFinite(firstSolve) && firstSolve < Infinity ? firstSolve - padMs : now - 7 * 86400000;
      let maxT = Math.max(lastT, now) + padMs / 2;
      if (maxT <= minT) {
        minT = now - 86400000;
        maxT = now + 3600000;
      }
      const xSpan = maxT - minT;
      const yMax = niceYMax(maxScore);
      const xScale = (t) => PAD_L + ((t - minT) / xSpan) * plotW;
      const yScale = (s) => PAD_T + plotH - (Math.min(s, yMax) / yMax) * plotH;

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const val = Math.round((yMax / 10) * i);
        const y = yScale(val);
        ctx.beginPath();
        ctx.moveTo(PAD_L, y);
        ctx.lineTo(PAD_L + plotW, y);
        ctx.stroke();
        ctx.fillStyle = 'rgba(226,232,240,0.5)';
        ctx.font = '11px ui-monospace, monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(val), PAD_L - 8, y);
      }

      for (let i = 0; i <= 5; i++) {
        const t = minT + (xSpan * i) / 5;
        const x = xScale(t);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.moveTo(x, PAD_T);
        ctx.lineTo(x, PAD_T + plotH);
        ctx.stroke();
        ctx.fillStyle = 'rgba(148,163,184,0.9)';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(formatAxisDate(t), x, PAD_T + plotH + 6);
      }

      const hasAnySolve = Object.values(byTeam).some((a) => a.length > 0);
      if (!hasAnySolve) {
        ctx.fillStyle = 'rgba(148,163,184,0.7)';
        ctx.font = '14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No correct submissions yet — lines appear as teams solve challenges.', PAD_L + plotW / 2, PAD_T + plotH / 2);
      }

      chartTeams.forEach((team, idx) => {
        const raw = byTeam[team.id];
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        const pts = [{ time: minT, score: 0 }];
        raw.forEach((p) => pts.push({ time: p.time, score: p.score, solve: p.solve }));
        const endScore = raw.length ? raw[raw.length - 1].score : 0;
        pts.push({ time: maxT, score: endScore });

        ctx.strokeStyle = color;
        ctx.lineWidth = raw.length ? 2 : 1;
        ctx.globalAlpha = raw.length ? 1 : 0.35;
        ctx.beginPath();
        let px = xScale(pts[0].time);
        let py = yScale(pts[0].score);
        ctx.moveTo(px, py);
        for (let i = 1; i < pts.length; i++) {
          const x = xScale(pts[i].time);
          const y = yScale(pts[i].score);
          ctx.lineTo(x, py);
          ctx.lineTo(x, y);
          px = x;
          py = y;
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        raw.forEach((p) => {
          const x = xScale(p.time);
          const y = yScale(p.score);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = bg;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      });
    }

    const t = requestAnimationFrame(draw);
    const ro = new ResizeObserver(() => requestAnimationFrame(draw));
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', draw);
    return () => {
      cancelAnimationFrame(t);
      ro.disconnect();
      window.removeEventListener('resize', draw);
    };
  }, [timeline, chartTeams]);

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', maxWidth: '100%', borderRadius: 6 }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '0.5rem 1rem',
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {chartTeams.map((t, i) => (
          <div
            key={t.id}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: '#cbd5e1' }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: CHART_COLORS[i % CHART_COLORS.length],
                flexShrink: 0,
                boxShadow: `0 0 0 1px rgba(0,0,0,0.3)`,
              }}
            />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.teamName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
