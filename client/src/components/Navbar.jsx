import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/');
    setOpen(false);
  }

  const linkClass = ({ isActive }) =>
    `nav-link${isActive ? ' active' : ''}`;

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link to="/" className="nav-brand" onClick={() => setOpen(false)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          TracebackCTF
        </Link>

        <button
          className="nav-mobile-toggle"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </>
            )}
          </svg>
        </button>

        <div className={`nav-links${open ? ' open' : ''}`}>
          {user ? (
            <>
              <NavLink to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>Dashboard</NavLink>
              <NavLink to="/challenges" className={linkClass} onClick={() => setOpen(false)}>Challenges</NavLink>
              <NavLink to="/leaderboard" className={linkClass} onClick={() => setOpen(false)}>Leaderboard</NavLink>
              {profile?.role === 'admin' && (
                <NavLink to="/admin" className={linkClass} onClick={() => setOpen(false)}>Admin</NavLink>
              )}
              <div className="nav-divider" />
              <Link to="/profile" className="nav-user-btn" onClick={() => setOpen(false)}>
                <span className="nav-avatar">
                  {(profile?.username || 'U')[0].toUpperCase()}
                </span>
                {profile?.username || 'Profile'}
              </Link>
              <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
