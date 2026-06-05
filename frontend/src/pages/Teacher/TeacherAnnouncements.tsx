import React, { useState, useEffect } from 'react';
import { announcementApi } from '../../services/api';
import axios from 'axios';
import './TeacherAnnouncements.css';

interface Announcement {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const TeacherAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readAnnouncements, setReadAnnouncements] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await announcementApi.getAll();
      const data = response.data.data || [];
      // Filter only active announcements and sort by display order
      const activeAnnouncements = data
        .filter((a: Announcement) => a.is_active)
        .sort((a: Announcement, b: Announcement) => a.display_order - b.display_order);
      setAnnouncements(activeAnnouncements);
      setError(null);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (announcementId: number) => {
    try {
      const teacherId = 1; // This should come from auth context
      await axios.post(`/api/announcements/${announcementId}/mark-read`, { teacherId });
      setReadAnnouncements(prev => new Set([...prev, announcementId]));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleAnnouncementClick = (announcementId: number) => {
    if (!readAnnouncements.has(announcementId)) {
      markAsRead(announcementId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="teacher-announcements">
      <div className="announcements-header">
        <h1>📢 School Announcements</h1>
        <p className="header-subtitle">Stay updated with the latest school news and events</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading announcements...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchAnnouncements} className="retry-btn">Retry</button>
        </div>
      ) : announcements.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No Announcements</h3>
          <p>There are no active announcements at this time.</p>
        </div>
      ) : (
        <div className="announcements-grid">
          {announcements.map((announcement) => (
            <div 
              key={announcement.id} 
              className={`announcement-card ${readAnnouncements.has(announcement.id) ? 'read' : 'unread'}`}
              onClick={() => handleAnnouncementClick(announcement.id)}
            >
              {announcement.image_url && (
                <div className="announcement-image">
                  <img src={announcement.image_url} alt={announcement.title} />
                </div>
              )}
              <div className="announcement-content">
                <div className="announcement-header">
                  <h3 className="announcement-title">{announcement.title}</h3>
                  {!readAnnouncements.has(announcement.id) && (
                    <span className="unread-badge">New</span>
                  )}
                </div>
                <p className="announcement-text">{announcement.content}</p>
                <div className="announcement-meta">
                  <span className="announcement-date">
                    📅 {formatDate(announcement.created_at)}
                  </span>
                  {readAnnouncements.has(announcement.id) && (
                    <span className="read-indicator">✓ Read</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherAnnouncements;
