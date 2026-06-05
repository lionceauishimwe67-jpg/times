import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../lib/api.js';

export default function SpecialDays() {
  const [ranges, setRanges] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    start_date: '', end_date: '', label: '', schedule_type: 'normal', is_enabled: true,
  });
  const [entries, setEntries] = useState([{ ring_time: '08:00', end_time: '10:00', label: '', duration_seconds: 3, should_ring: true }]);

  const load = () => api('/api/special-days').then(setRanges);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault(); setMsg(''); setErr('');
    try {
      const body = { ...form, entries: form.schedule_type === 'exam' ? entries : [] };
      const r = await api('/api/special-days', { method: 'POST', body });
      setMsg(`✓ Added ${r.inserted} day(s)`);
      setForm({ start_date: '', end_date: '', label: '', schedule_type: 'normal', is_enabled: true });
      await load();
    } catch (e) { setErr(e.message); }
  };

  const del = async (start, end) => {
    if (!confirm('Delete this entire period? Normal schedule will resume.')) return;
    await api(`/api/special-days?start=${start}&end=${end}`, { method: 'DELETE' });
    await load();
  };

  const updEntry = (i, k, v) => setEntries(entries.map((e, idx) => idx === i ? { ...e, [k]: v } : e));

  return (
    <Layout>
      <h2 style={{ marginBottom: 12 }}>Special Days & Periods Management</h2>
      <p style={{ marginBottom: 16 }}>Configure exam periods, holidays, or any date range with special schedule.</p>
      {msg && <div className="alert success">{msg}</div>}
      {err && <div className="alert error">{err}</div>}

      <div className="card">
        <h3>Add Special Period</h3>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Start date</label>
              <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>End date</label>
              <input type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Label / Reason</label>
            <input type="text" required placeholder="e.g., Final Exam Week, Christmas Holiday"
              value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Schedule Type</label>
            <select value={form.schedule_type} onChange={(e) => setForm({ ...form, schedule_type: e.target.value })}>
              <option value="normal">📋 Normal — Follow regular schedule</option>
              <option value="exam">📝 Exam Period — Custom schedule</option>
              <option value="silent">🔕 Silent Period — No bells</option>
            </select>
          </div>
          <div className="form-group">
            <label><input type="checkbox" checked={form.is_enabled} onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })} /> Enable this period</label>
          </div>

          {form.schedule_type === 'exam' && (
            <div>
              <h4 style={{ margin: '12px 0' }}>📝 Exam Period Schedule (applies to all days in range)</h4>
              {entries.map((en, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr auto auto', gap: 8, marginBottom: 8 }}>
                  <input type="time" step="1" value={en.ring_time} onChange={(e) => updEntry(i, 'ring_time', e.target.value)} />
                  <input type="time" step="1" value={en.end_time} onChange={(e) => updEntry(i, 'end_time', e.target.value)} />
                  <input type="text" placeholder="Event description" value={en.label} onChange={(e) => updEntry(i, 'label', e.target.value)} />
                  <input type="number" min="1" max="60" value={en.duration_seconds} onChange={(e) => updEntry(i, 'duration_seconds', +e.target.value)} />
                  <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input type="checkbox" checked={en.should_ring} onChange={(e) => updEntry(i, 'should_ring', e.target.checked)} /> Ring
                  </label>
                  <button type="button" className="btn btn-danger" onClick={() => setEntries(entries.filter((_, idx) => idx !== i))}>X</button>
                </div>
              ))}
              <button type="button" className="btn btn-success"
                onClick={() => setEntries([...entries, { ring_time: '08:00', end_time: '09:00', label: '', duration_seconds: 3, should_ring: true }])}>
                + Add Period
              </button>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ marginTop: 16 }}>Add Special Period</button>
        </form>
      </div>

      <div className="card">
        <h3>Configured Special Periods</h3>
        {ranges.length === 0 ? <p style={{ color: '#666' }}>No special periods configured.</p> : ranges.map((r, i) => (
          <div className="period-card" key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <strong>📅 {r.start} → {r.end} ({r.count} days) — {r.label}</strong>
              <span className="badge">{r.entries?.length ? '📝 Exam' : '🔕 Silent/Normal'}</span>
              <button className="btn btn-danger" onClick={() => del(r.start, r.end)}>Delete</button>
            </div>
            {r.entries?.length > 0 && (
              <table style={{ marginTop: 10, width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th align="left">Start</th><th align="left">End</th><th align="left">Event</th><th>Bell</th><th>Sec</th></tr></thead>
                <tbody>
                  {r.entries.map((e, j) => (
                    <tr key={j}><td>{e.ring_time}</td><td>{e.end_time || '-'}</td><td>{e.label}</td><td>{e.should_ring ? '🔔' : '🔕'}</td><td>{e.duration_seconds}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}
