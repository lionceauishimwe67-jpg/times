import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bellApi, timetableApi } from '../../services/api';
import { useBellSound } from '../../hooks/useBellSound';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [triggeringBell, setTriggeringBell] = useState(false);
  const [bellTriggered, setBellTriggered] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const refRes = await timetableApi.getReferenceData();
      const subjectsData = refRes.data.data.subjects || [];
      setSubjects(subjectsData);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const { playBellSound } = useBellSound();

  const triggerBell = async () => {
    setTriggeringBell(true);
    try {
      await bellApi.triggerManualBell();
      setBellTriggered(true);
      playBellSound();
      setTimeout(() => setBellTriggered(false), 3000);
    } catch (error) {
      console.error('Failed to trigger bell:', error);
      alert('Failed to trigger bell. Please try again.');
    } finally {
      setTriggeringBell(false);
    }
  };

  const quickActions = [
    {
      icon: '🔔',
      title: 'Ring Bell',
      description: 'Trigger school bell immediately',
      action: triggerBell,
      color: '#ef4444',
      isBell: true,
      path: undefined,
    },
    {
      icon: '📅',
      title: 'Manage Timetable',
      description: 'Add, edit, or delete class schedules',
      path: '/admin/timetable',
      color: '#3b82f6',
      isBell: false,
    },
    {
      icon: '🤖',
      title: 'AI Smart Timetable',
      description: 'Generate timetable from chronogram with AI',
      path: '/admin/smart-timetable',
      color: '#0f3460',
      isBell: false,
    },
    {
      icon: '📢',
      title: 'Announcements',
      description: 'Upload and manage display content',
      path: '/admin/announcements',
      color: '#10b981',
      isBell: false,
    },
    {
      icon: '📺',
      title: 'View Display',
      description: 'Preview the display screen',
      path: '/display',
      color: '#8b5cf6',
      external: true,
      isBell: false,
    },
  ];

  const stats = [
    { icon: '⏰', label: 'Lunch Break', value: '12:25 PM - 1:25 PM', color: '#f59e0b' },
    { icon: '☕', label: 'Afternoon Break', value: '3:30 PM - 3:45 PM', color: '#ec4899' },
    { icon: '🌙', label: 'Day Ends', value: '5:00 PM', color: '#6366f1' },
    { icon: '📚', label: 'Etude Time', value: '6:30 PM - 8:25 PM', color: '#14b8a6' },
  ];

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Welcome back! Manage your school timetable efficiently.</p>
        </div>
        <div className="dashboard-time">
          <span className="time-icon">🕐</span>
          <span className="time-value">
            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card" style={{ '--stat-color': stat.color } as React.CSSProperties}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-content">
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="section-title">
        <span className="section-icon">⚡</span>
        Quick Actions
      </div>
      <div className="actions-grid">
        {quickActions.map((action, index) => (
          <div
            key={index}
            className={`action-card ${action.isBell ? 'bell-action' : ''} ${bellTriggered && action.isBell ? 'bell-triggered' : ''}`}
            style={{ '--action-color': action.color } as React.CSSProperties}
            onClick={() => {
              if (action.isBell && action.action) {
                action.action();
              } else if (action.external && action.path) {
                window.open(action.path, '_blank');
              } else if (action.path) {
                navigate(action.path);
              }
            }}
          >
            <div className="action-icon-wrapper">
              <span className="action-icon">{action.icon}</span>
            </div>
            <div className="action-content">
              <h3 className="action-title">{action.title}</h3>
              <p className="action-description">{action.description}</p>
            </div>
            {action.isBell ? (
              <div className="bell-status">
                {triggeringBell ? <span className="bell-spinner">⏳</span> : bellTriggered ? <span className="bell-success">✓</span> : <span className="action-arrow">→</span>}
              </div>
            ) : (
              <div className="action-arrow">→</div>
            )}
          </div>
        ))}
      </div>

      {/* Subjects Section */}
      <div className="section-title">
        <span className="section-icon">📚</span>
        Subjects (Amasomo)
      </div>
      <div className="subjects-section">
        {loadingSubjects ? (
          <div className="loading-text">Loading subjects...</div>
        ) : (
          <>
            <div className="subjects-summary">
              <div className="subject-stat">
                <span className="stat-number">{subjects.length}</span>
                <span className="stat-label">Total Subjects</span>
              </div>
            </div>
            <div className="subjects-grid">
              {subjects.slice(0, 20).map((subject) => (
                <div key={subject.id} className="subject-card">
                  <div className="subject-icon">📖</div>
                  <div className="subject-name">{subject.name}</div>
                </div>
              ))}
            </div>
            {subjects.length > 20 && (
              <div className="subjects-more">
                And {subjects.length - 20} more subjects...
              </div>
            )}
          </>
        )}
      </div>

      {/* Info Cards */}
      <div className="info-section">
        <div className="info-card primary">
          <div className="info-icon">💡</div>
          <div className="info-content">
            <h3>Quick Tip</h3>
            <p>
              Changes made here will automatically appear on all display screens within 5-10 seconds 
              due to automatic polling. No manual refresh needed!
            </p>
          </div>
        </div>

        <div className="info-card secondary">
          <div className="info-icon">🔗</div>
          <div className="info-content">
            <h3>Display URL</h3>
            <code className="url-code">{window.location.origin}/display</code>
            <p>Use this URL for Raspberry Pi displays or any screen showing the timetable.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <p>School Timetable Management System © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};

export default Dashboard;
