import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../lib/api.js';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export default function Schedule() {
  const [week, setWeek] = useState([]);
  const [active, setActive] = useState(0);
  const [msg, setMsg] = useState('');
  const [copyFrom, setCopyFrom] = useState(0);

  const load = () => api('/api/schedule').then(setWeek);
  useEffect(() => { load(); }, []);

  const day = week[active];
  const updateEntry = (i, field, val) => {
    const copy = [...week];
    copy[active] = { ...copy[active], entries: copy[active].entries.map((e, idx) => idx === i ? { ...e, [field]: val } : e) };
    setWeek(copy);
  };
  const addEntry = () => {
    const copy = [...week];
    copy[active] = { ...copy[active], entries: [...copy[active].entries, { ring_time: '08:00', label: '', duration_seconds: 5 }] };
    setWeek(copy);
  };
  const removeEntry = (i) => {
    const copy = [...week];
    copy[active] = { ...copy[active], entries: copy[active].entries.filter((_, idx) => idx !== i) };
    setWeek(copy);
  };
  const toggleEnabled = (e) => {
    const copy = [...week];
    copy[active] = { ...copy[active], enabled: e.target.checked };
    setWeek(copy);
  };
  const save = async () => {
    setMsg('');
    try {
      await api(`/api/schedule/${day.day}`, { method: 'PUT', body: { is_enabled: day.enabled, entries: day.entries } });
      setMsg('✓ Schedule updated!');
      setTimeout(() => setMsg(''), 2500);
    } catch (e) { setMsg('✗ ' + e.message); }
  };
  const copyAll = async () => {
    if (!confirm('Copy this schedule to ALL other days? This overwrites existing schedules.')) return;
    await api('/api/schedule/copy', { method: 'POST', body: { source_day: copyFrom } });
    await load();
    setMsg('✓ Copied to all days!');
    setTimeout(() => setMsg(''), 2500);
  };

  if (!day) return <Layout><p>Loading…</p></Layout>;

  return (
    <Layout>
      <h2 style={{ marginBottom: 16 }}>Weekly Schedule Management</h2>
      {msg && <div className="alert success">{msg}</div>}

      <div className="card" style={{ background: '#08752e', color: 'white', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong>📋 Copy Schedule:</strong>
        <select value={copyFrom} onChange={(e) => setCopyFrom(+e.target.value)} style={{ width: 'auto' }}>
          {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
        <button className="btn btn-warning" onClick={copyAll}>Copy to All Days</button>
      </div>

      <div className="tabs">
        {DAYS.map((d, i) => (
          <button key={i} className={`tab ${i === active ? 'active' : ''}`} onClick={() => setActive(i)}>{d}</button>
        ))}
      </div>

      <div className="card" style={{ background: '#3f4e91', color: 'white' }}>
        <div className="form-group">
          <label><input type="checkbox" checked={day.enabled} onChange={toggleEnabled} /> Enable {DAYS[day.day]}</label>
        </div>
        <h3>Bell Schedule Entries</h3>
        {day.entries.map((e, i) => (
          <div className="entry-row" key={i}>
            <input type="time" step="1" value={e.ring_time?.slice(0, 5)} onChange={(ev) => updateEntry(i, 'ring_time', ev.target.value)} />
            <input type="text" placeholder="Event label" value={e.label} onChange={(ev) => updateEntry(i, 'label', ev.target.value)} />
            <input type="number" min="1" max="60" value={e.duration_seconds} onChange={(ev) => updateEntry(i, 'duration_seconds', +ev.target.value)} />
            <button className="btn btn-danger" onClick={() => removeEntry(i)}>Remove</button>
          </div>
        ))}
        <button className="btn btn-success" style={{ marginTop: 10 }} onClick={addEntry}>+ Add Entry</button>
        <div style={{ marginTop: 20 }}>
          <button className="btn btn-primary" onClick={save}>Save Schedule</button>
        </div>
      </div>
    </Layout>
  );
}
