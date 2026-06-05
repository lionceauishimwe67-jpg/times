import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import './Admin.css';

const Admin: React.FC = () => {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-logo">
            <span>📚</span>
            School Timetable
          </h2>
          <p className="sidebar-subtitle">Admin Dashboard</p>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/admin/dashboard" className="nav-item" end>
            <span className="nav-icon">📊</span>
            Dashboard
          </NavLink>
          <NavLink to="/admin/timetable" className="nav-item">
            <span className="nav-icon">🗓️</span>
            Manage Timetable
          </NavLink>
          <NavLink to="/admin/timetable-generator" className="nav-item">
            <span className="nav-icon">⚙️</span>
            Timetable Generator
          </NavLink>
          <NavLink to="/admin/smart-timetable" className="nav-item">
            <span className="nav-icon">AI</span>
            Smart Timetable
          </NavLink>
          <NavLink to="/admin/timetable/view" className="nav-item">
            <span className="nav-icon">📋</span>
            View Full Timetable
          </NavLink>
          <NavLink to="/admin/schedule" className="nav-item">
            <span className="nav-icon">⏰</span>
            Schedule Management
          </NavLink>
          <NavLink to="/admin/teachers" className="nav-item">
            <span className="nav-icon">👨‍🏫</span>
            Teacher Profiles
          </NavLink>
          <NavLink to="/admin/announcements" className="nav-item">
            <span className="nav-icon">📢</span>
            Announcements
          </NavLink>
          <NavLink to="/admin/notifications" className="nav-item">
            <span className="nav-icon">🔔</span>
            Notification Status
          </NavLink>
          <NavLink to="/admin/phone-numbers" className="nav-item">
            <span className="nav-icon">📱</span>
            Phone Numbers (SMS)
          </NavLink>
          <NavLink to="/admin/profile" className="nav-item">
            <span className="nav-icon">👤</span>
            My Profile
          </NavLink>
          <NavLink to="/manager" className="nav-item">
            <span className="nav-icon">👔</span>
            Manager Dashboard
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button onClick={() => navigate('/display')} className="back-button">
            <span>🔙</span>
            Back to Display
          </button>
          <div className="user-info">
            <div className="user-avatar">👤</div>
            <div className="user-details">
              <div className="user-name">{user?.username || 'Admin'}</div>
              <div className="user-role">{user?.role || 'admin'}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <span>🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default Admin;
