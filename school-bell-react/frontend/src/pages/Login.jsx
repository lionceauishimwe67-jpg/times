import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await login(username, password); nav('/'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="login-wrap">
      <div className="login-box">
        <h1>🏫 School Bell System</h1>
        <h2>Administrator Login</h2>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Signing in…' : 'Login'}
          </button>
        </form>
        <p style={{ marginTop: 18, textAlign: 'center', fontSize: 12, color: '#666' }}>
          Default: <strong>admin</strong> / <strong>admin123</strong>
        </p>
      </div>
    </div>
  );
}
