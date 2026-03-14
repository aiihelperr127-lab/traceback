import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { adminApi } from '../services/api';

/* ─── SVG Icons (inline, no emoji) ───────────────── */
const Icon = {
  chart: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>,
  target: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  team: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
  inbox: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>,
  clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  megaphone: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  back: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
};

const TABS = [
  { id: 'overview',       label: 'Overview',       icon: Icon.chart },
  { id: 'challenges',     label: 'Challenges',     icon: Icon.target },
  { id: 'users',          label: 'Users',          icon: Icon.users },
  { id: 'teams',          label: 'Teams',          icon: Icon.team },
  { id: 'submissions',    label: 'Submissions',    icon: Icon.inbox },
  { id: 'event',          label: 'Event',          icon: Icon.clock },
  { id: 'announcements',  label: 'Announcements',  icon: Icon.megaphone },
  { id: 'settings',       label: 'Settings',       icon: Icon.settings },
];

const CATEGORIES = ['web', 'pwn', 'crypto', 'reversing', 'forensics', 'misc', 'osint', 'steganography'];
const DIFFICULTIES = ['easy', 'medium', 'hard', 'insane'];

function FileUploadField({ files, setFiles, showToast }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const inputRef = useRef(null);

  async function handleUpload(fileList) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const result = await adminApi.uploadFiles(fileList);
      if (!result.files || !result.files.length) {
        setUploadError('Server returned no files. Check API logs.');
        showToast('error', 'Upload finished but no file URLs returned.');
        return;
      }
      const newFiles = (result.files || [])
        .filter((f) => f && (f.url || f.name))
        .map((f) => ({
          name: f.name || 'file',
          url: f.url || '',
          size: Number(f.size) || 0,
        }));
      setFiles((prev) => [...(Array.isArray(prev) ? prev : []), ...newFiles]);
      showToast('success', `${newFiles.length} file${newFiles.length > 1 ? 's' : ''} uploaded`);
    } catch (err) {
      const msg = err.message || 'Upload failed';
      setUploadError(msg);
      showToast('error', msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }

  function removeFile(index) {
    setFiles((prev) => (Array.isArray(prev) ? prev : []).filter((_, i) => i !== index));
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  return (
    <div className="field">
      <label className="field-label">Challenge Files</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--c-cyan)' : 'var(--c-border)'}`,
          borderRadius: '8px',
          padding: '1.25rem',
          textAlign: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          background: dragOver ? 'rgba(0,200,180,0.05)' : 'transparent',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleUpload(e.target.files)}
        />
        {uploading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <div className="spinner" style={{ width: 18, height: 18 }} />
            <span style={{ color: 'var(--c-text-2)', fontSize: '0.85rem' }}>Uploading...</span>
          </div>
        ) : (
          <div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--c-text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.4rem' }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div style={{ color: 'var(--c-text-2)', fontSize: '0.85rem' }}>Drop files here or click to browse</div>
            <div style={{ color: 'var(--c-text-3)', fontSize: '0.75rem', marginTop: '0.2rem' }}>Max 50 MB per file</div>
          </div>
        )}
      </div>
      {uploadError && (
        <div
          role="alert"
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid rgba(248,113,113,0.4)',
            background: 'rgba(127,29,29,0.25)',
            color: 'var(--c-text-1)',
            fontSize: '0.85rem',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: 'rgb(252,165,165)' }}>Upload failed</div>
          <div>{uploadError}</div>
          {String(uploadError).includes('bucket') || String(uploadError).includes('Storage') ? (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--c-text-3)' }}>
              Open <strong>Firebase Console → Storage → Get started</strong> if you have not yet. Restart the API after fixing. Optional: set <span className="mono">FIREBASE_STORAGE_BUCKET</span> in <span className="mono">.env</span> to the exact bucket name from Google Cloud → Storage → Buckets.
            </div>
          ) : null}
        </div>
      )}
      {Array.isArray(files) && files.length > 0 && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'var(--c-bg-1)', borderRadius: '6px', border: '1px solid var(--c-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
                <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{typeof f === 'string' ? f.split('/').pop() : (f?.name || 'file')}</span>
                {f && f.size > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--c-text-3)', flexShrink: 0 }}>{formatSize(f.size)}</span>}
              </div>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => removeFile(i)} style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', flexShrink: 0 }}>Remove</button>
            </div>
          ))}
        </div>
      )}
      <span className="field-hint">Upload binaries, pcap files, source code, or any attachments for this challenge.</span>
    </div>
  );
}

const EMPTY_CHALLENGE = {
  title: '', category: 'web', difficulty: 'easy', points: 100,
  description: '', flag: '', hints: '', tags: '', author: '', sourceUrl: '',
  isActive: true, files: [],
};

export default function Admin() {
  const { profile } = useAuth();
  const [tab, setTab] = useState('overview');
  const [toast, setToast] = useState(null);

  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="page">
      <div className="container">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">Platform management and monitoring</p>
        </div>

        {toast && (
          <div className={`alert alert-${toast.type === 'success' ? 'success' : 'error'} animate-fade adm-toast`}>
            {toast.text}
          </div>
        )}

        <div className="adm-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`adm-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              <span className="adm-tab-icon">{t.icon}</span>
              <span className="adm-tab-label">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="adm-content animate-fade" key={tab}>
          {tab === 'overview'       && <OverviewTab />}
          {tab === 'challenges'     && <ChallengesTab showToast={showToast} />}
          {tab === 'users'          && <UsersTab showToast={showToast} />}
          {tab === 'teams'          && <TeamsTab showToast={showToast} />}
          {tab === 'submissions'    && <SubmissionsTab />}
          {tab === 'event'          && <EventTab showToast={showToast} />}
          {tab === 'announcements'  && <AnnouncementsTab showToast={showToast} />}
          {tab === 'settings'       && <SettingsTab showToast={showToast} />}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Overview
   ═══════════════════════════════════════════════════════ */
function OverviewTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const s = data?.stats || {};
  const cards = [
    { label: 'Total Challenges',  value: s.challenges ?? 0,       color: 'var(--c-cyan)' },
    { label: 'Active Challenges', value: s.activeChallenges ?? 0,  color: 'var(--c-green)' },
    { label: 'Registered Teams',  value: s.teams ?? 0,             color: 'var(--c-purple)' },
    { label: 'Registered Users',  value: s.users ?? 0,             color: 'var(--c-amber)' },
    { label: 'Total Submissions', value: s.submissions ?? 0,       color: 'var(--c-text-1)' },
    { label: 'Correct Solves',    value: s.correctSolves ?? 0,     color: 'var(--c-green)' },
  ];

  const activity = data?.recentActivity || [];

  return (
    <div>
      <div className="adm-stat-grid">
        {cards.map((c, i) => (
          <div key={i} className="card adm-stat-card">
            <div className="adm-stat-label">{c.label}</div>
            <div className="adm-stat-value mono" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '1.25rem' }}>
        <div className="adm-stat-label" style={{ marginBottom: '0.5rem' }}>Competition Status</div>
        <span className={`badge ${s.eventActive ? 'badge-easy' : 'badge-hard'}`}>
          {s.eventActive ? 'LIVE' : 'INACTIVE'}
        </span>
      </div>

      {activity.length > 0 && (
        <div className="card" style={{ marginTop: '1.25rem' }}>
          <div className="adm-stat-label" style={{ marginBottom: '0.75rem' }}>Recent Submissions</div>
          <div className="adm-activity-list">
            {activity.map((a) => (
              <div key={a.id} className="adm-activity-row">
                <span className={`adm-activity-dot ${a.correct ? 'correct' : 'wrong'}`} />
                <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--c-text-2)', fontWeight: 600 }}>
                  {a.username || a.userId?.slice(0, 8)}
                </span>
                <span style={{ color: 'var(--c-text-3)' }}>submitted to</span>
                <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--c-text-2)', fontWeight: 600 }}>
                  {a.challengeTitle || a.challengeId?.slice(0, 8)}
                </span>
                <span className={a.correct ? 'adm-correct-text' : 'adm-wrong-text'}>
                  {a.correct ? 'correct' : 'incorrect'}
                </span>
                <span className="adm-activity-time">
                  {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Challenges
   ═══════════════════════════════════════════════════════ */
function ChallengesTab({ showToast }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('list');
  const [form, setForm] = useState({ ...EMPTY_CHALLENGE });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listChallenges().then((d) => setChallenges(d.challenges)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm({ ...EMPTY_CHALLENGE });
    setEditId(null);
    setMode('form');
  }

  async function openEdit(id) {
    try {
      const { challenge } = await adminApi.getChallenge(id);
      setForm({
        title: challenge.title || '',
        category: challenge.category || 'web',
        difficulty: challenge.difficulty || 'easy',
        points: challenge.points || 100,
        description: challenge.description || '',
        flag: challenge.flag || '',
        hints: (challenge.hints || []).join('\n'),
        tags: (challenge.tags || []).join(', '),
        author: challenge.author || '',
        sourceUrl: challenge.sourceUrl || '',
        isActive: challenge.isActive ?? true,
        files: challenge.files || [],
      });
      setEditId(id);
      setMode('form');
    } catch (err) {
      showToast('error', err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        points: Number(form.points),
        hints: form.hints ? form.hints.split('\n').map((h) => h.trim()).filter(Boolean) : [],
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        files: Array.isArray(form.files) ? form.files : [],
      };
      if (editId) {
        await adminApi.updateChallenge(editId, payload);
        showToast('success', 'Challenge updated');
      } else {
        const data = await adminApi.createChallenge(payload);
        showToast('success', `Challenge created (${data.id})`);
      }
      setMode('list');
      load();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id, current) {
    try {
      await adminApi.toggleChallenge(id, !current);
      setChallenges((prev) => prev.map((c) => c.id === id ? { ...c, isActive: !current } : c));
    } catch (err) {
      showToast('error', err.message);
    }
  }

  async function handleDuplicate(id) {
    try {
      const { id: newId } = await adminApi.duplicateChallenge(id);
      showToast('success', `Duplicated as ${newId}`);
      load();
    } catch (err) {
      showToast('error', err.message);
    }
  }

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await adminApi.deleteChallenge(id);
      showToast('success', 'Challenge deleted');
      load();
    } catch (err) {
      showToast('error', err.message);
    }
  }

  function updateField(e) {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  }

  // ─── Form view ──────────────────────
  if (mode === 'form') {
    return (
      <div className="adm-form-wrap animate-in">
        <button className="adm-back-btn" onClick={() => setMode('list')}>{Icon.back} Back to list</button>
        <div className="card">
          <h2 className="adm-section-title">{editId ? 'Edit Challenge' : 'Create Challenge'}</h2>
          <form className="adm-form" onSubmit={handleSubmit}>
            <div className="field">
              <label className="field-label">Title *</label>
              <input className="input" name="title" value={form.title} onChange={updateField} required placeholder="Challenge name" />
            </div>
            <div className="adm-form-row-4">
              <div className="field">
                <label className="field-label">Category *</label>
                <select className="input" name="category" value={form.category} onChange={updateField}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Difficulty *</label>
                <select className="input" name="difficulty" value={form.difficulty} onChange={updateField}>
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Points *</label>
                <input className="input" type="number" name="points" value={form.points} onChange={updateField} min={1} required />
              </div>
              <div className="field">
                <label className="field-label">Author</label>
                <input className="input" name="author" value={form.author} onChange={updateField} placeholder="Optional" />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Description</label>
              <textarea className="input" name="description" value={form.description} onChange={updateField} rows={6} placeholder="Full challenge description. Markdown or plain text." />
            </div>
            <div className="field">
              <label className="field-label">Flag *</label>
              <input className="input mono" name="flag" value={form.flag} onChange={updateField} required={!editId} placeholder="flag{example_flag_here}" autoComplete="off" />
              <span className="field-hint">{editId ? 'Leave unchanged to keep current flag, or enter a new one.' : 'Exact string players must submit.'}</span>
            </div>
            <div className="adm-form-row-2">
              <div className="field">
                <label className="field-label">Hints (one per line)</label>
                <textarea className="input" name="hints" value={form.hints} onChange={updateField} rows={3} placeholder={"First hint\nSecond hint\nThird hint"} />
                <span className="field-hint">Players may optionally request hints during the event.</span>
              </div>
              <div className="field">
                <label className="field-label">Tags (comma-separated)</label>
                <input className="input" name="tags" value={form.tags} onChange={updateField} placeholder="sql-injection, xss, beginner" />
                <span className="field-hint">Used for filtering and search.</span>
              </div>
            </div>
            <FileUploadField
              files={Array.isArray(form.files) ? form.files : []}
              setFiles={(next) =>
                setForm((p) => ({
                  ...p,
                  files: typeof next === 'function' ? next(Array.isArray(p.files) ? p.files : []) : next,
                }))
              }
              showToast={showToast}
            />
            <div className="field">
              <label className="field-label">Source / Reference URL</label>
              <input className="input" name="sourceUrl" value={form.sourceUrl} onChange={updateField} placeholder="https://..." />
              <span className="field-hint">Internal reference only (not shown on the player challenge page).</span>
            </div>
            <label className="adm-toggle-row">
              <input type="checkbox" name="isActive" checked={form.isActive} onChange={updateField} />
              <span className="adm-toggle-label">Active</span>
              <span className="field-hint">&mdash; Visible and solvable by players</span>
            </label>
            <div className="flex gap-sm" style={{ marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editId ? 'Save Changes' : 'Create Challenge'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setMode('list')}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ─── List view ──────────────────────
  if (loading) return <Loading />;

  const filtered = challenges.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.title.toLowerCase().includes(q) || c.category.includes(q) || (c.tags || []).some((t) => t.includes(q));
    const matchCat = filterCat === 'all' || c.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="flex gap-sm items-center" style={{ flex: 1, minWidth: 200 }}>
          <input className="input" placeholder="Search by title, category, or tag..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
          <select className="input" value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Challenge</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="empty-state"><p>No challenges match your filters.</p></div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Title</th><th>Category</th><th>Difficulty</th><th>Points</th><th>Solves</th><th>Status</th><th style={{ width: 190 }}>Actions</th></tr></thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="adm-cell-title">{c.title}</td>
                    <td><span className="adm-cell-cat">{c.category}</span></td>
                    <td><span className={`badge badge-${c.difficulty}`}>{c.difficulty}</span></td>
                    <td className="mono" style={{ color: 'var(--c-cyan)' }}>{c.points}</td>
                    <td>{c.solveCount || 0}</td>
                    <td>
                      <button className={`adm-status-pill ${c.isActive ? 'active' : 'inactive'}`} onClick={() => handleToggle(c.id, c.isActive)} title={c.isActive ? 'Click to disable' : 'Click to enable'}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <div className="flex gap-xs">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c.id)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDuplicate(c.id)}>Clone</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id, c.title)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="adm-footer-count">{filtered.length} of {challenges.length} challenge{challenges.length !== 1 ? 's' : ''}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Users
   ═══════════════════════════════════════════════════════ */
function UsersTab({ showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingScore, setEditingScore] = useState(null);
  const [scoreValue, setScoreValue] = useState('');

  useEffect(() => {
    adminApi.listUsers().then((d) => setUsers(d.users)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function changeRole(uid, currentRole, newRole) {
    if (newRole === currentRole) return;
    if (!window.confirm(`Change role to "${newRole}"?`)) return;
    try {
      await adminApi.updateUser(uid, { role: newRole });
      setUsers((p) => p.map((u) => u.id === uid ? { ...u, role: newRole } : u));
      showToast('success', `Role updated to ${newRole}`);
    } catch (err) { showToast('error', err.message); }
  }

  async function toggleBan(uid, currentBan) {
    const action = currentBan ? 'unban' : 'ban';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this user?`)) return;
    try {
      await adminApi.updateUser(uid, { banned: !currentBan });
      setUsers((p) => p.map((u) => u.id === uid ? { ...u, banned: !currentBan } : u));
      showToast('success', `User ${action}ned`);
    } catch (err) { showToast('error', err.message); }
  }

  function startEditScore(user) {
    setEditingScore(user.id);
    setScoreValue(String(user.teamScore ?? 0));
  }

  function cancelEditScore() {
    setEditingScore(null);
    setScoreValue('');
  }

  async function saveScore(user) {
    const val = Number(scoreValue);
    if (isNaN(val)) { showToast('error', 'Enter a valid number'); return; }
    try {
      await adminApi.updateTeam(user.teamId, { score: val });
      setUsers((p) => p.map((u) => u.id === user.id ? { ...u, teamScore: val } : u));
      showToast('success', `Score updated to ${val}`);
      setEditingScore(null);
      setScoreValue('');
    } catch (err) { showToast('error', err.message); }
  }

  if (loading) return <Loading />;

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  return (
    <div>
      <input className="input" placeholder="Search by username or email..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 300, marginBottom: '1rem' }} />
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="empty-state"><p>No users found.</p></div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Team</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th style={{ width: 220 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} style={u.banned ? { opacity: 0.5 } : undefined}>
                    <td className="mono" style={{ fontWeight: 600 }}>{u.username || '\u2014'}</td>
                    <td style={{ color: 'var(--c-text-2)', fontSize: '0.85rem' }}>{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, u.role, e.target.value)}
                        className="input"
                        style={{ padding: '0.25rem 0.4rem', fontSize: '0.8rem', width: 'auto', minWidth: 90, cursor: 'pointer', background: u.role === 'admin' ? 'rgba(0,200,180,0.12)' : 'rgba(100,120,255,0.10)', border: `1px solid ${u.role === 'admin' ? 'var(--c-cyan)' : 'var(--c-purple)'}`, color: u.role === 'admin' ? 'var(--c-cyan)' : 'var(--c-purple)', fontWeight: 600 }}
                      >
                        <option value="player">Player</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="mono" style={{ fontSize: '0.82rem', color: 'var(--c-text-3)' }}>{u.teamName || u.teamId || '\u2014'}</td>
                    <td>
                      {u.teamId ? (
                        editingScore === u.id ? (
                          <div className="flex gap-xs" style={{ alignItems: 'center' }}>
                            <input
                              type="number"
                              className="input"
                              value={scoreValue}
                              onChange={(e) => setScoreValue(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveScore(u); if (e.key === 'Escape') cancelEditScore(); }}
                              style={{ width: 80, padding: '0.25rem 0.4rem', fontSize: '0.85rem' }}
                              autoFocus
                            />
                            <button className="btn btn-primary btn-sm" onClick={() => saveScore(u)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                              Save
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={cancelEditScore} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span
                            className="mono"
                            style={{ cursor: 'pointer', borderBottom: '1px dashed var(--c-text-3)' }}
                            title="Click to edit score"
                            onClick={() => startEditScore(u)}
                          >
                            {u.teamScore ?? 0}
                          </span>
                        )
                      ) : (
                        <span style={{ color: 'var(--c-text-3)' }}>{'\u2014'}</span>
                      )}
                    </td>
                    <td>
                      {u.banned
                        ? <span className="badge badge-hard">Banned</span>
                        : <span className="badge badge-easy">Active</span>
                      }
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--c-text-3)' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '\u2014'}</td>
                    <td>
                      <div className="flex gap-xs">
                        {u.teamId && (
                          <button className="btn btn-ghost btn-sm" onClick={() => startEditScore(u)}>
                            Edit Pts
                          </button>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={() => toggleBan(u.id, u.banned)}>
                          {u.banned ? 'Unban' : 'Ban'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="adm-footer-count">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Teams
   ═══════════════════════════════════════════════════════ */
function TeamsTab({ showToast }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [editingScore, setEditingScore] = useState(null);
  const [scoreValue, setScoreValue] = useState('');

  function load() {
    setLoading(true);
    adminApi.listTeams().then((d) => setTeams(d.teams)).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDeleteTeam(teamId, teamName) {
    if (!window.confirm(`Delete team "${teamName}"? All members will be removed.`)) return;
    try {
      await adminApi.deleteTeam(teamId);
      setTeams((p) => p.filter((t) => t.id !== teamId));
      showToast('success', 'Team deleted');
    } catch (err) { showToast('error', err.message); }
  }

  async function handleKick(teamId, uid, username) {
    if (!window.confirm(`Remove "${username}" from the team?`)) return;
    try {
      await adminApi.kickMember(teamId, uid);
      load();
      showToast('success', `${username} removed`);
    } catch (err) { showToast('error', err.message); }
  }

  async function saveScore(teamId) {
    const val = Number(scoreValue);
    if (isNaN(val)) { showToast('error', 'Enter a valid number'); return; }
    try {
      await adminApi.updateTeam(teamId, { score: val });
      setTeams((p) => p.map((t) => t.id === teamId ? { ...t, score: val } : t));
      showToast('success', `Score updated to ${val}`);
      setEditingScore(null);
    } catch (err) { showToast('error', err.message); }
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {teams.length === 0 ? (
          <div className="empty-state"><p>No teams registered.</p></div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}></th>
                  <th>Team Name</th>
                  <th>Invite Code</th>
                  <th>Members</th>
                  <th>Score</th>
                  <th>Last Solve</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <React.Fragment key={t.id}>
                    <tr>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                          style={{ padding: '0.15rem 0.3rem', fontSize: '0.75rem' }}
                        >
                          {expanded === t.id ? '\u25BC' : '\u25B6'}
                        </button>
                      </td>
                      <td style={{ fontWeight: 600 }}>{t.teamName}</td>
                      <td><code className="mono" style={{ fontSize: '0.8rem', color: 'var(--c-yellow)', letterSpacing: '0.1em' }}>{t.inviteCode || '\u2014'}</code></td>
                      <td>{t.members?.length || 0} / 2</td>
                      <td>
                        {editingScore === t.id ? (
                          <div className="flex gap-xs" style={{ alignItems: 'center' }}>
                            <input type="number" className="input" value={scoreValue} onChange={(e) => setScoreValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveScore(t.id); if (e.key === 'Escape') setEditingScore(null); }} style={{ width: 80, padding: '0.25rem 0.4rem', fontSize: '0.85rem' }} autoFocus />
                            <button className="btn btn-primary btn-sm" onClick={() => saveScore(t.id)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>Save</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingScore(null)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>Cancel</button>
                          </div>
                        ) : (
                          <span className="mono" style={{ color: 'var(--c-cyan)', fontWeight: 700, cursor: 'pointer', borderBottom: '1px dashed var(--c-text-3)' }} title="Click to edit" onClick={() => { setEditingScore(t.id); setScoreValue(String(t.score || 0)); }}>
                            {t.score || 0}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--c-text-3)' }}>{t.lastSolveTime ? new Date(t.lastSolveTime).toLocaleString() : '\u2014'}</td>
                      <td>
                        <div className="flex gap-xs">
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditingScore(t.id); setScoreValue(String(t.score || 0)); }}>Edit Pts</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTeam(t.id, t.teamName)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                    {expanded === t.id && (
                      <tr>
                        <td colSpan={7} style={{ background: 'var(--c-bg-1)', padding: '0.75rem 1.25rem' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--c-text-3)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Members</div>
                          {t.members?.map((m) => (
                            <div key={m.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--c-border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className="mono" style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.username}</span>
                                {m.uid === t.captainId && (
                                  <span style={{ fontSize: '0.6rem', background: 'rgba(0,200,180,0.15)', color: 'var(--c-cyan)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontWeight: 600, textTransform: 'uppercase' }}>Captain</span>
                                )}
                                <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--c-text-3)' }}>{m.uid}</span>
                              </div>
                              <button className="btn btn-danger btn-sm" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleKick(t.id, m.uid, m.username)}>Kick</button>
                            </div>
                          ))}
                          {(!t.members || t.members.length === 0) && <p style={{ color: 'var(--c-text-3)', fontSize: '0.82rem' }}>No members</p>}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="adm-footer-count">{teams.length} team{teams.length !== 1 ? 's' : ''}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Submissions
   ═══════════════════════════════════════════════════════ */
function SubmissionsTab() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    adminApi.listSubmissions(100).then((d) => setSubmissions(d.submissions)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const filtered = filter === 'all' ? submissions : filter === 'correct' ? submissions.filter((s) => s.correct) : submissions.filter((s) => !s.correct);

  return (
    <div>
      <div className="flex gap-sm items-center" style={{ marginBottom: '1rem' }}>
        <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="all">All submissions</option>
          <option value="correct">Correct only</option>
          <option value="wrong">Incorrect only</option>
        </select>
        <span className="adm-footer-count" style={{ marginTop: 0 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="empty-state"><p>No submissions found.</p></div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Time</th><th>User</th><th>Team</th><th>Challenge</th><th>Submitted Flag</th><th>Result</th></tr></thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontSize: '0.82rem', color: 'var(--c-text-3)', whiteSpace: 'nowrap' }}>{new Date(s.timestamp).toLocaleString()}</td>
                    <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>{s.username || s.userId?.slice(0, 12)}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--c-text-2)' }}>{s.teamName || s.teamId?.slice(0, 12) || '\u2014'}</td>
                    <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>{s.challengeTitle || s.challengeId?.slice(0, 12)}</td>
                    <td className="mono" style={{ fontSize: '0.78rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.flag}</td>
                    <td><span className={`badge ${s.correct ? 'badge-easy' : 'badge-hard'}`}>{s.correct ? 'Correct' : 'Wrong'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Event
   ═══════════════════════════════════════════════════════ */
function EventTab({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState('idle');
  const [remaining, setRemaining] = useState(0);
  const [duration, setDuration] = useState(0);
  const pollRef = useRef(null);

  const pad = (n) => String(n).padStart(2, '0');

  function loadEvent() {
    return adminApi.getEvent().then(({ event }) => {
      if (event) {
        setTitle(event.title || '');
        setStatus(event.status || 'idle');
        setRemaining(event.remaining ?? 0);
        setDuration(event.duration || 0);
        if (event.status === 'idle' && event.duration) {
          setHours(Math.floor(event.duration / 3600));
          setMinutes(Math.floor((event.duration % 3600) / 60));
          setSeconds(event.duration % 60);
        }
      }
    });
  }

  useEffect(() => {
    loadEvent().catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === 'running') {
      pollRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(pollRef.current);
            setStatus('ended');
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status]);

  async function doAction(action) {
    setBusy(true);
    try {
      const dur = (hours * 3600) + (minutes * 60) + seconds;
      await adminApi.timerAction({ action, duration: dur || duration, title });
      await loadEvent();
      const labels = { start: 'Timer started', pause: 'Timer paused', reset: 'Timer reset', configure: 'Settings saved' };
      showToast('success', labels[action] || 'Done');
    } catch (err) { showToast('error', err.message); }
    finally { setBusy(false); }
  }

  if (loading) return <Loading />;

  const dispH = Math.floor(remaining / 3600);
  const dispM = Math.floor((remaining % 3600) / 60);
  const dispS = remaining % 60;

  const statusColors = { idle: 'var(--c-text-3)', running: 'var(--c-green)', paused: 'var(--c-yellow)', ended: 'var(--c-red)' };
  const statusLabels = { idle: 'Idle', running: 'Running', paused: 'Paused', ended: 'Ended' };

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="card" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: statusColors[status], marginBottom: '0.5rem' }}>
          {statusLabels[status]}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '4rem', fontWeight: 700, lineHeight: 1, letterSpacing: '0.05em', color: status === 'ended' ? 'var(--c-red)' : remaining < 300 && status === 'running' ? 'var(--c-red)' : 'var(--c-text-1)' }}>
          {pad(dispH)}:{pad(dispM)}:{pad(dispS)}
        </div>
        {duration > 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--c-text-3)', marginTop: '0.5rem' }}>
            Total: {pad(Math.floor(duration / 3600))}:{pad(Math.floor((duration % 3600) / 60))}:{pad(duration % 60)}
          </div>
        )}
        <div className="flex gap-sm" style={{ justifyContent: 'center', marginTop: '1.25rem' }}>
          {(status === 'idle' || status === 'paused') && (
            <button className="btn btn-primary" disabled={busy} onClick={() => doAction('start')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              {status === 'paused' ? 'Resume' : 'Start'}
            </button>
          )}
          {status === 'running' && (
            <button className="btn btn-ghost" disabled={busy} onClick={() => doAction('pause')} style={{ borderColor: 'var(--c-yellow)', color: 'var(--c-yellow)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
              Pause
            </button>
          )}
          {status !== 'idle' && (
            <button className="btn btn-danger" disabled={busy} onClick={() => { if (window.confirm('Reset the timer? This cannot be undone.')) doAction('reset'); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="adm-section-title">Timer Configuration</h2>
        <div className="adm-form">
          <div className="field">
            <label className="field-label">Event Title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="TracebackCTF 2026" />
          </div>
          <div className="field">
            <label className="field-label">Duration</label>
            <div className="flex gap-sm" style={{ alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <input type="number" min="0" max="99" className="input" value={hours} onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))} style={{ width: 70, textAlign: 'center', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }} disabled={status === 'running'} />
                <span style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', marginTop: '0.25rem' }}>Hours</span>
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--c-text-3)' }}>:</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <input type="number" min="0" max="59" className="input" value={minutes} onChange={(e) => setMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))} style={{ width: 70, textAlign: 'center', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }} disabled={status === 'running'} />
                <span style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', marginTop: '0.25rem' }}>Minutes</span>
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--c-text-3)' }}>:</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <input type="number" min="0" max="59" className="input" value={seconds} onChange={(e) => setSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))} style={{ width: 70, textAlign: 'center', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }} disabled={status === 'running'} />
                <span style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', marginTop: '0.25rem' }}>Seconds</span>
              </div>
            </div>
          </div>
          <button className="btn btn-primary" disabled={busy || status === 'running'} onClick={() => doAction('configure')} style={{ marginTop: '0.5rem' }}>
            Save Configuration
          </button>
          <p style={{ fontSize: '0.8rem', color: 'var(--c-text-3)', marginTop: '0.75rem' }}>
            Flag submissions are only accepted while the timer is running.
            When the timer ends or is paused, submissions are blocked.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Announcements
   ═══════════════════════════════════════════════════════ */
function AnnouncementsTab({ showToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', body: '', type: 'info', active: true });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.listAnnouncements().then((d) => setItems(d.announcements)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  function resetForm() { setForm({ title: '', body: '', type: 'info', active: true }); setEditId(null); }

  function startEdit(a) {
    setForm({ title: a.title, body: a.body || '', type: a.type || 'info', active: a.active !== false });
    setEditId(a.id);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await adminApi.updateAnnouncement(editId, form);
        showToast('success', 'Announcement updated');
      } else {
        await adminApi.createAnnouncement(form);
        showToast('success', 'Announcement published');
      }
      resetForm();
      load();
    } catch (err) { showToast('error', err.message); } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this announcement?')) return;
    try { await adminApi.deleteAnnouncement(id); load(); showToast('success', 'Deleted'); } catch (err) { showToast('error', err.message); }
  }

  async function handleToggle(id, current) {
    try {
      await adminApi.updateAnnouncement(id, { active: !current });
      setItems((p) => p.map((a) => a.id === id ? { ...a, active: !current } : a));
    } catch (err) { showToast('error', err.message); }
  }

  if (loading) return <Loading />;

  return (
    <div className="adm-form-row-2" style={{ display: 'grid', alignItems: 'start' }}>
      <div className="card">
        <h2 className="adm-section-title">{editId ? 'Edit Announcement' : 'New Announcement'}</h2>
        <form className="adm-form" onSubmit={handleSubmit}>
          <div className="field"><label className="field-label">Title *</label><input className="input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required placeholder="Announcement title" /></div>
          <div className="field"><label className="field-label">Body</label><textarea className="input" value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} rows={3} placeholder="Details (optional)" /></div>
          <div className="field">
            <label className="field-label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <label className="adm-toggle-row">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} />
            <span className="adm-toggle-label">Visible to players</span>
          </label>
          <div className="flex gap-sm">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Publish'}</button>
            {editId && <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>

      <div>
        {items.length === 0 ? (
          <div className="card empty-state"><p>No announcements yet.</p></div>
        ) : (
          <div className="flex flex-col gap-sm">
            {items.map((a) => (
              <div key={a.id} className="card" style={{ padding: '1rem 1.25rem' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '0.35rem' }}>
                  <div className="flex gap-sm items-center">
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.title}</span>
                    <span className={`badge ${a.type === 'urgent' ? 'badge-hard' : a.type === 'warning' ? 'badge-medium' : 'badge-player'}`}>{a.type}</span>
                  </div>
                  <button className={`adm-status-pill ${a.active ? 'active' : 'inactive'}`} onClick={() => handleToggle(a.id, a.active)}>
                    {a.active ? 'Visible' : 'Hidden'}
                  </button>
                </div>
                {a.body && <p style={{ fontSize: '0.84rem', color: 'var(--c-text-2)', marginBottom: '0.5rem' }}>{a.body}</p>}
                <div className="flex gap-sm items-center">
                  <span style={{ fontSize: '0.75rem', color: 'var(--c-text-3)' }}>{new Date(a.createdAt).toLocaleString()}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(a)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Settings
   ═══════════════════════════════════════════════════════ */
function SettingsTab({ showToast }) {
  const [form, setForm] = useState({ registrationOpen: true, maxTeamSize: 4, flagFormat: 'flag{...}', platformName: 'TracebackCTF', allowLateJoins: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getSettings().then(({ settings }) => setForm((p) => ({ ...p, ...settings }))).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function updateField(e) { const { name, value, type, checked } = e.target; setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value })); }

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      await adminApi.updateSettings(form);
      showToast('success', 'Platform settings saved');
    } catch (err) { showToast('error', err.message); } finally { setSaving(false); }
  }

  if (loading) return <Loading />;

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="card">
        <h2 className="adm-section-title">Platform Settings</h2>
        <form className="adm-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label">Platform Name</label>
            <input className="input" name="platformName" value={form.platformName} onChange={updateField} />
          </div>
          <div className="field">
            <label className="field-label">Flag Format Hint</label>
            <input className="input mono" name="flagFormat" value={form.flagFormat} onChange={updateField} placeholder="flag{...}" />
            <span className="field-hint">Shown to players as a formatting hint.</span>
          </div>
          <div className="field">
            <label className="field-label">Maximum Team Size</label>
            <input className="input" type="number" name="maxTeamSize" value={form.maxTeamSize} onChange={updateField} min={1} max={20} />
          </div>
          <label className="adm-toggle-row">
            <input type="checkbox" name="registrationOpen" checked={form.registrationOpen} onChange={updateField} />
            <span className="adm-toggle-label">Registration Open</span>
            <span className="field-hint">&mdash; New users can create accounts</span>
          </label>
          <label className="adm-toggle-row">
            <input type="checkbox" name="allowLateJoins" checked={form.allowLateJoins} onChange={updateField} />
            <span className="adm-toggle-label">Allow Late Team Joins</span>
            <span className="field-hint">&mdash; Players can join teams after the event starts</span>
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '0.5rem' }}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Shared
   ═══════════════════════════════════════════════════════ */
function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0', gap: '0.75rem', color: 'var(--c-text-3)', alignItems: 'center' }}>
      <div className="loading-spinner" /> Loading...
    </div>
  );
}
