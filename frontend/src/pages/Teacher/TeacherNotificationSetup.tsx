import React, { useState, useEffect } from 'react';
import { authApi, notificationApi, teachersApi } from '../../services/api';
import './TeacherNotificationSetup.css';

interface TeacherNotificationSetupProps {}

interface NotificationPreferences {
  notification_enabled: boolean;
  notification_advance_minutes: number;
}

interface Notification {
  id: number;
  teacher_id: number;
  timetable_id: number;
  notification_type: string;
  title: string;
  body: string;
  sent_at: string;
  status: string;
  class_name?: string;
  subject_name?: string;
}

const TeacherNotificationSetup: React.FC<TeacherNotificationSetupProps> = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    notification_enabled: true,
    notification_advance_minutes: 15
  });
  const [deviceToken, setDeviceToken] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile update state
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');

  // Registration form state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regTeacherId, setRegTeacherId] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);

  const checkTeacherStatus = async () => {
    try {
      const userResponse = await authApi.verify();
      if (userResponse.data.data.role === 'teacher') {
        setIsRegistered(true);
        setTeacherData(userResponse.data.data);
        loadNotificationPreferences();
        loadNotificationHistory();
      }
    } catch (error) {
      console.log('Not logged in or not a teacher');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTeachers = async () => {
    try {
      const response = await teachersApi.getAll();
      const teachers = response.data.data || [];
      // Filter teachers that are not yet registered (no user_id)
      const unregisteredTeachers = teachers.filter((t: any) => !t.user_id);
      setAvailableTeachers(unregisteredTeachers);
    } catch (error) {
      console.error('Failed to load teachers:', error);
    }
  };

  const loadNotificationPreferences = async () => {
    try {
      const response = await notificationApi.getPreferences();
      setPreferences(response.data.data);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const loadNotificationHistory = async () => {
    try {
      const response = await notificationApi.getHistory();
      setNotifications(response.data.data || []);
    } catch (error) {
      console.error('Failed to load notification history:', error);
    }
  };

  useEffect(() => {
    checkTeacherStatus();
    loadAvailableTeachers();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await authApi.registerTeacher({
        username: regUsername,
        password: regPassword,
        teacherId: parseInt(regTeacherId),
        email: regEmail,
        phone: regPhone
      });
      
      localStorage.setItem('token', response.data.data.token);
      setIsRegistered(true);
      setTeacherData(response.data.data.user);
      setShowRegistrationForm(false);
      loadNotificationPreferences();
      loadNotificationHistory();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Registration failed');
    }
  };

  const handleRegisterDeviceToken = async () => {
    try {
      await notificationApi.registerDeviceToken({
        deviceToken: deviceToken,
        teacherId: teacherData?.teacherId
      });
      alert('Device token registered successfully');
      setDeviceToken('');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to register device token');
    }
  };

  const handleUpdatePreferences = async () => {
    try {
      await notificationApi.updatePreferences({
        notificationEnabled: preferences.notification_enabled,
        notificationAdvanceMinutes: preferences.notification_advance_minutes
      });
      alert('Preferences updated successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update preferences');
    }
  };

  const handleSendTestNotification = async () => {
    try {
      await notificationApi.sendTestNotification({
        teacherId: teacherData?.teacherId
      });
      alert('Test notification sent');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to send test notification');
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await teachersApi.update(teacherData?.teacherId, {
        email: profileEmail,
        phone: profilePhone
      });
      alert('Profile updated successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update profile');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isRegistered && !showRegistrationForm) {
    return (
      <div className="teacher-notification-container">
        <div className="notification-card">
          <h2>Teacher Notification Setup</h2>
          <p>Register to receive notifications about your upcoming classes on your phone.</p>
          <button 
            className="btn-primary"
            onClick={() => setShowRegistrationForm(true)}
          >
            Register for Notifications
          </button>
        </div>
      </div>
    );
  }

  if (showRegistrationForm) {
    return (
      <div className="teacher-notification-container">
        <div className="notification-card">
          <h2>Teacher Registration</h2>
          <form onSubmit={handleRegister} className="registration-form">
            <div className="form-group">
              <label>Select Your Name:</label>
              <select
                value={regTeacherId}
                onChange={(e) => setRegTeacherId(e.target.value)}
                required
              >
                <option value="">-- Select your name --</option>
                {availableTeachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Username:</label>
              <input
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                required
                placeholder="Choose a username"
              />
            </div>
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                placeholder="Min 8 characters"
                minLength={8}
              />
            </div>
            <div className="form-group">
              <label>Email (optional):</label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="your.email@school.edu"
              />
            </div>
            <div className="form-group">
              <label>Phone (optional):</label>
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+250..."
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Register</button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => setShowRegistrationForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-notification-container">
      <div className="notification-card">
        <h2>Teacher Notification Setup</h2>
        {teacherData && (
          <div className="teacher-info">
            <p><strong>Name:</strong> {teacherData.teacherName}</p>
            <p><strong>Username:</strong> {teacherData.username}</p>
            <p><strong>Status:</strong> Registered for notifications</p>
          </div>
        )}
      </div>

      <div className="notification-card">
        <h3>Update Profile</h3>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            placeholder="your.email@school.edu"
            value={profileEmail}
            onChange={(e) => setProfileEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Phone:</label>
          <input
            type="tel"
            placeholder="+250..."
            value={profilePhone}
            onChange={(e) => setProfilePhone(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={handleUpdateProfile}>
          Update Profile
        </button>
      </div>

      <div className="notification-card">
        <h3>Device Registration</h3>
        <p>Register your device to receive push notifications</p>
        <div className="form-group">
          <input
            type="text"
            value={deviceToken}
            onChange={(e) => setDeviceToken(e.target.value)}
            placeholder="Enter FCM device token"
          />
        </div>
        <button className="btn-primary" onClick={handleRegisterDeviceToken}>
          Register Device
        </button>
        <button className="btn-secondary" onClick={handleSendTestNotification}>
          Send Test Notification
        </button>
      </div>

      <div className="notification-card">
        <h3>Notification Preferences</h3>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={preferences.notification_enabled}
              onChange={(e) => setPreferences({
                ...preferences,
                notification_enabled: e.target.checked
              })}
            />
            Enable Notifications
          </label>
        </div>
        <div className="form-group">
          <label>Remind me (minutes before class):</label>
          <input
            type="number"
            value={preferences.notification_advance_minutes}
            onChange={(e) => setPreferences({
              ...preferences,
              notification_advance_minutes: parseInt(e.target.value)
            })}
            min={5}
            max={60}
          />
        </div>
        <button className="btn-primary" onClick={handleUpdatePreferences}>
          Save Preferences
        </button>
      </div>

      <div className="notification-card">
        <h3>Notification History</h3>
        {notifications.length === 0 ? (
          <p>No notifications yet</p>
        ) : (
          <div className="notification-list">
            {notifications.map(notif => (
              <div key={notif.id} className={`notification-item ${notif.status}`}>
                <div className="notification-header">
                  <strong>{notif.title}</strong>
                  <span className="notification-time">
                    {new Date(notif.sent_at).toLocaleString()}
                  </span>
                </div>
                <p>{notif.body}</p>
                <div className="notification-meta">
                  <span className={`status ${notif.status}`}>{notif.status}</span>
                  {notif.class_name && <span>Class: {notif.class_name}</span>}
                  {notif.subject_name && <span>Subject: {notif.subject_name}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherNotificationSetup;
