import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function AnnouncementBanner() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    if (!user) return;
    api.getAnnouncements()
      .then((d) => setAnnouncements(d.announcements || []))
      .catch(() => {});
  }, [user]);

  if (!announcements.length) return null;

  return (
    <div>
      {announcements.map((a) => (
        <div key={a.id} className={`announcement-bar type-${a.type || 'info'}`}>
          <div className="announcement-bar-inner">
            <span className="announcement-bar-title">{a.title}</span>
            {a.body && <span className="announcement-bar-body">{a.body}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
