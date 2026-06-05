import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import './Profile.css';

const Profile: React.FC = () => {
  const { user } = useAuthContext();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (form.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword(form.currentPassword, form.newPassword);
      setMessage('Password changed successfully');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1><span>👤</span> My Profile</h1>
      </div>

      <div className="profile-grid">
        <div className="profile-card info">
          <h2>Account Information</h2>
          <div className="info-list">
            <div className="info-row">
              <span className="info-label">Username</span>
              <span className="info-value">{user?.username || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Role</span>
              <span className="info-value"><span className="role-badge">{user?.role || 'admin'}</span></span>
            </div>
            <div className="info-row">
              <span className="info-label">User ID</span>
              <span className="info-value">{user?.id || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="profile-card security">
          <h2>Security</h2>
          {message && <div className="alert success">{message}</div>}
          {error && <div className="alert error">{error}</div>}
          <form onSubmit={handleChangePassword} className="password-form">
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                required
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                placeholder="Enter current password"
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                required
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                placeholder="Enter new password"
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
