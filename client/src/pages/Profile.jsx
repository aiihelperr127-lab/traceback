import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, profile } = useAuth();

  return (
    <div className="page">
      <div className="container">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 className="page-title">Profile</h1>
        </div>

        <div className="profile-layout animate-in">
          <div className="card profile-sidebar">
            <div className="profile-avatar">
              {(profile?.username || 'U')[0].toUpperCase()}
            </div>
            <div className="profile-name">{profile?.username || 'Unknown'}</div>
            <div className="profile-email">{user?.email}</div>
            <span className={`badge badge-${profile?.role === 'admin' ? 'admin' : 'player'}`}>
              {profile?.role || 'player'}
            </span>
          </div>

          <div className="card profile-details">
            <div className="section-label" style={{ padding: '0 0 0.75rem' }}>Account Details</div>
            <div className="profile-row">
              <span className="profile-row-label">User ID</span>
              <span className="profile-row-value">{profile?.uid ? `${profile.uid.slice(0, 12)}...` : '\u2014'}</span>
            </div>
            <div className="profile-row">
              <span className="profile-row-label">Team</span>
              <span className="profile-row-value">{profile?.teamId || 'No team'}</span>
            </div>
            <div className="profile-row">
              <span className="profile-row-label">Email</span>
              <span className="profile-row-value">{user?.email || '\u2014'}</span>
            </div>
            <div className="profile-row">
              <span className="profile-row-label">Joined</span>
              <span className="profile-row-value">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                  : '\u2014'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
