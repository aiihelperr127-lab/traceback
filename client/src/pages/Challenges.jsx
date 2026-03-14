import { useEffect, useState } from 'react';
import ChallengeCard from '../components/ChallengeCard';
import { api } from '../services/api';

const CATEGORIES = ['all', 'web', 'pwn', 'crypto', 'reversing', 'forensics', 'misc', 'osint', 'steganography'];

export default function Challenges() {
  const [challenges, setChallenges] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getChallenges();
        if (!cancelled) setChallenges(data.challenges);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = filter === 'all'
    ? challenges
    : challenges.filter((c) => c.category === filter);

  return (
    <div className="page">
      <div className="container">
        <div style={{ marginBottom: '1.25rem' }}>
          <h1 className="page-title">Challenges</h1>
          <p className="page-subtitle">Solve challenges to earn points for your team</p>
        </div>

        <div className="filters" style={{ marginBottom: '1.5rem' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`filter-chip${filter === cat ? ' active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading && (
          <div className="loading-page" style={{ minHeight: '40vh' }}>
            <div className="loading-spinner" />
            <span>Loading challenges...</span>
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ maxWidth: 480 }}>{error}</div>
        )}

        {!loading && !error && (
          filtered.length > 0 ? (
            <div className="grid grid-auto animate-in">
              {filtered.map((c, i) => (
                <ChallengeCard key={c.id} challenge={c} style={{ animationDelay: `${0.03 * i}s` }} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>{challenges.length === 0 ? 'No challenges available yet.' : 'No challenges in this category.'}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
