import React, { useState, useEffect } from 'react';
import { notificationApi } from '../../services/api';
import './NotificationStatus.css';

interface Notification {
  id: number;
  teacher_id: number;
  timetable_id: number | null;
  notification_type: string;
  title: string;
  body: string;
  status: string;
  sent_via: string;
  sent_at: string;
  is_read: number;
  read_at: string | null;
  created_at: string;
  teacher_name: string;
  class_name: string | null;
  subject_name: string | null;
}

interface TeacherSummary {
  total: number;
  read: number;
  unread: number;
}

interface TeacherGroup {
  teacher: { id: number; name: string };
  notifications: Notification[];
  summary: TeacherSummary;
}

const NotificationStatus: React.FC = () => {
  const [teachers, setTeachers] = useState<TeacherGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [expandedTeacher, setExpandedTeacher] = useState<number | null>(null);

  useEffect(() => {
    loadStatus();
  }, [selectedTeacher]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedTeacher) params.teacher_id = selectedTeacher;
      const response = await notificationApi.getTeacherStatus(params);
      setTeachers(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'class_reminder': return '⏰';
      case 'class_start': return '▶️';
      case 'class_end': return '⏹️';
      case 'class_ending': return '⚠️';
      case 'absent_teacher': return '❌';
      case 'test': return '🧪';
      default: return '🔔';
    }
  };

  const getStatusBadge = (n: Notification) => {
    if (n.is_read) {
      return <span className="badge badge-read">✓ Read {n.read_at ? new Date(n.read_at).toLocaleString() : ''}</span>;
    }
    if (n.status === 'sent') {
      return <span className="badge badge-sent">📤 Sent</span>;
    }
    return <span className="badge badge-failed">{n.status}</span>;
  };

  const toggleExpand = (teacherId: number) => {
    setExpandedTeacher(expandedTeacher === teacherId ? null : teacherId);
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div>
      <div className="admin-header">
        <h1 className="page-title">Notification Status</h1>
        <div className="header-actions">
          <button onClick={loadStatus} className="btn btn-secondary">
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <div className="card">
        {teachers.length === 0 ? (
          <div className="empty-state">No notifications found</div>
        ) : (
          <table className="notification-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Total</th>
                <th>✓ Read</th>
                <th>✉ Unread</th>
                <th>Rate</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((group) => {
                const rate = group.summary.total > 0
                  ? Math.round((group.summary.read / group.summary.total) * 100)
                  : 0;
                return (
                  <React.Fragment key={group.teacher.id}>
                    <tr
                      className="teacher-row"
                      onClick={() => toggleExpand(group.teacher.id)}
                    >
                      <td>
                        <span className="teacher-name-cell">
                          {group.teacher.name || `Teacher #${group.teacher.id}`}
                        </span>
                      </td>
                      <td>{group.summary.total}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{group.summary.read}</td>
                      <td style={{ color: '#f59e0b', fontWeight: 600 }}>{group.summary.unread}</td>
                      <td>
                        <div className="rate-bar-wrapper">
                          <div
                            className="rate-bar-fill"
                            style={{
                              width: `${rate}%`,
                              background: rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444'
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{rate}%</span>
                      </td>
                      <td>
                        <span className="expand-icon">
                          {expandedTeacher === group.teacher.id ? '▲' : '▼'}
                        </span>
                      </td>
                    </tr>
                    {expandedTeacher === group.teacher.id && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0 }}>
                          <div className="notification-details">
                            <table className="notification-detail-table">
                              <thead>
                                <tr>
                                  <th>Type</th>
                                  <th>Title</th>
                                  <th>Class</th>
                                  <th>Subject</th>
                                  <th>Sent</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.notifications.map((n) => (
                                  <tr key={n.id}>
                                    <td>
                                      <span title={n.notification_type}>
                                        {getTypeIcon(n.notification_type)}
                                      </span>
                                    </td>
                                    <td>{n.title}</td>
                                    <td>{n.class_name || '-'}</td>
                                    <td>{n.subject_name || '-'}</td>
                                    <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                      {n.sent_at ? new Date(n.sent_at).toLocaleString() : '-'}
                                    </td>
                                    <td>{getStatusBadge(n)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default NotificationStatus;