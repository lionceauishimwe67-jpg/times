import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../AuthContext.jsx';

export default function Settings() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault(); setMsg(''); setErr('');
    if (form.newPassword !== form.confirm) return setErr('New passwords do not match');
    if (form.newPassword.length < 4) return setErr('Password must be at least 4 characters');
    try {
      await api('/api/auth/change-password', { method: 'POST', body: { currentPassword: form.currentPassword, newPassword: form.newPassword } });
      setMsg('✅ Password changed! Logging out…');
      setTimeout(() => { setUser(null); nav('/login'); }, 1500);
    } catch (e) { setErr(e.message); }
  };

  return (
    <Layout>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <h2>🔐 Change Password</h2>
          {msg && <div className="alert success">{msg}</div>}
          {err && <div className="alert error">{err}</div>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" required value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" required minLength={4} value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" required value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
            </div>
            <button className="btn btn-success">Update Password</button>
          </form>
        </div>
        <div className="card">
          <h2>👤 Account</h2>
          <p><strong>Username:</strong> {user?.username}</p>
          <p><strong>User ID:</strong> {user?.id}</p>
          <p style={{ marginTop: 16 }}><strong>Server time:</strong> {new Date().toLocaleString()}</p>
        </div>
      </div>
    </Layout>
  );
}
