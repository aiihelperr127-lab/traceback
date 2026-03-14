import { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';

export default function Timer() {
  const [status, setStatus] = useState('idle');
  const [remaining, setRemaining] = useState(0);
  const [title, setTitle] = useState('');
  const tickRef = useRef(null);
  const pollRef = useRef(null);

  function applyState(data) {
    setStatus(data.status);
    setRemaining(data.remaining);
    setTitle(data.title || '');
  }

  useEffect(() => {
    api.getTimer().then(applyState).catch(() => {});

    pollRef.current = setInterval(() => {
      api.getTimer().then(applyState).catch(() => {});
    }, 15000);

    return () => { clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (status === 'running') {
      tickRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(tickRef.current);
            setStatus('ended');
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else if (tickRef.current) {
      clearInterval(tickRef.current);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [status]);

  const pad = (n) => String(n).padStart(2, '0');
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;

  if (status === 'idle') {
    return (
      <div className="timer">
        <span className="timer-label">Competition</span>
        <span className="timer-value" style={{ color: 'var(--c-text-3)' }}>00:00:00</span>
      </div>
    );
  }

  if (status === 'paused') {
    return (
      <div className="timer">
        <span className="timer-label">{title || 'Competition'}</span>
        <span className="timer-value" style={{ color: 'var(--c-amber)' }}>{pad(h)}:{pad(m)}:{pad(s)}</span>
        <span className="timer-status" style={{ color: 'var(--c-amber)' }}>Paused</span>
      </div>
    );
  }

  if (status === 'ended') {
    return (
      <div className="timer timer-urgent">
        <span className="timer-label">{title || 'Competition'}</span>
        <span className="timer-value">00:00:00</span>
        <span className="timer-status" style={{ color: 'var(--c-red)' }}>Time Up</span>
      </div>
    );
  }

  return (
    <div className={`timer${remaining < 300 ? ' timer-urgent' : ''}`}>
      <span className="timer-label">{title || 'Time Remaining'}</span>
      <span className="timer-value">{pad(h)}:{pad(m)}:{pad(s)}</span>
    </div>
  );
}
