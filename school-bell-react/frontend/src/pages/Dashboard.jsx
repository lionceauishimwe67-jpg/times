import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../AuthContext.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [today, setToday] = useState(null);
  const [esp32, setEsp32] = useState({ status: 'checking' });
  const [now, setNow] = useState(new Date());
  const [ringMsg, setRingMsg] = useState('');
  const [ringing, setRinging] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    api('/api/schedule/today').then(setToday).catch(() => setToday({ entries: [], day_name: '', date: '' }));
    const check = () => api('/api/check-status').then(setEsp32).catch(() => setEsp32({ status: 'offline' }));
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  const ringNow = async () => {
    setRinging(true); setRingMsg('');
    try { await api('/api/ring-now', { method: 'POST' }); setRingMsg('✓ Bell ringing requested!'); }
    catch (e) { setRingMsg('✗ ' + e.message); }
    finally { setRinging(false); setTimeout(() => setRingMsg(''), 3000); }
  };

  const fmtTime = (t) => { const [h, m] = t.split(':'); const d = new Date(); d.setHours(+h, +m); return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); };
  const isPast = (t) => { const [h, m] = t.split(':'); const d = new Date(); d.setHours(+h, +m, 0); return d < now; };

  return (
    <Layout>
      <div className="card green">
        <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>🕐 {now.toLocaleTimeString()}</div>
        <h2>Welcome, {user?.username}!</h2>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={ringNow} disabled={ringing}>
          🔔 {ringing ? 'Ringing…' : 'Ring Bell Now'}
        </button>
        {ringMsg && <div style={{ marginTop: 10 }}>{ringMsg}</div>}
      </div>

      <div className="card orange">
        <h3>Today's Schedule — {today?.day_name} {today?.date}
          {today?.special && <span className="badge">Special: {today.special.label}</span>}
        </h3>
        {today?.entries?.length ? (
          <table className="table">
            <thead><tr><th>Time</th><th>Event</th><th>Duration</th><th>Status</th></tr></thead>
            <tbody>
              {today.entries.map((e, i) => (
                <tr key={i} style={{ opacity: isPast(e.ring_time) ? 0.6 : 1 }}>
                  <td><strong>{fmtTime(e.ring_time)}</strong></td>
                  <td>{e.label}</td>
                  <td>{e.duration_seconds} seconds</td>
                  <td>{isPast(e.ring_time) ? '✓ Done' : '⏰ Upcoming'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: 'center', padding: 20 }}>No bells scheduled for today.</p>
        )}
      </div>

      <div className="card orange">
        <h3>System Status</h3>
        <p style={{ margin: '10px 0' }}><strong>ESP32 Device:</strong>{' '}
          {esp32.status === 'online' ? <span className="online">✓ Online</span> : <span className="offline">✗ {esp32.status === 'checking' ? 'Checking…' : 'Offline'}</span>}
        </p>
        <p style={{ margin: '10px 0' }}><strong>Last seen:</strong> {esp32.last_seen || '—'}</p>
        <p style={{ margin: '10px 0' }}><strong>Bells today:</strong> {today?.entries?.length || 0}</p>
      </div>
    </Layout>
  );
}
