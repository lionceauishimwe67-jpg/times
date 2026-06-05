import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/special-days  -> grouped consecutive ranges
router.get('/', requireAuth, async (req, res) => {
  const [days] = await pool.query('SELECT * FROM special_days ORDER BY calendar_date');
  const ranges = [];
  let cur = null;
  for (const d of days) {
    if (!cur) { cur = { start: d.calendar_date, end: d.calendar_date, label: d.label, is_enabled: d.is_enabled, count: 1, ids: [d.id] }; continue; }
    const prev = new Date(cur.end).getTime();
    const curr = new Date(d.calendar_date).getTime();
    if (curr - prev === 86400000 && cur.label === d.label) {
      cur.end = d.calendar_date; cur.count++; cur.ids.push(d.id);
    } else {
      ranges.push(cur);
      cur = { start: d.calendar_date, end: d.calendar_date, label: d.label, is_enabled: d.is_enabled, count: 1, ids: [d.id] };
    }
  }
  if (cur) ranges.push(cur);

  // attach entries per range
  for (const r of ranges) {
    const [entries] = await pool.query(
      `SELECT ring_time, end_time, label, duration_seconds, should_ring
       FROM schedule_entries
       WHERE special_day_id IN (${r.ids.map(() => '?').join(',')})`,
      r.ids
    );
    r.entries = entries;
  }

  res.json(ranges);
});

// POST /api/special-days  { start_date, end_date, label, is_enabled, schedule_type, entries? }
router.post('/', requireAuth, async (req, res) => {
  const { start_date, end_date, label, is_enabled = true, schedule_type = 'normal', entries = [] } = req.body || {};
  if (!start_date || !end_date || !label) return res.status(400).json({ error: 'Missing fields' });
  if (new Date(start_date) > new Date(end_date)) return res.status(400).json({ error: 'End date must be after start date' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let inserted = 0;
    for (let t = new Date(start_date).getTime(); t <= new Date(end_date).getTime(); t += 86400000) {
      const date = new Date(t).toISOString().slice(0, 10);
      const [exists] = await conn.query('SELECT id FROM special_days WHERE calendar_date = ?', [date]);
      if (exists.length) continue;
      const [r] = await conn.query(
        'INSERT INTO special_days (calendar_date, end_date, label, is_enabled) VALUES (?,?,?,?)',
        [date, end_date, label, is_enabled ? 1 : 0]
      );
      const sdId = r.insertId;
      if (schedule_type === 'exam') {
        for (const e of entries) {
          if (!e.ring_time || !e.label) continue;
          await conn.query(
            'INSERT INTO schedule_entries (special_day_id, ring_time, end_time, label, duration_seconds, should_ring) VALUES (?,?,?,?,?,?)',
            [sdId, e.ring_time, e.end_time || null, e.label, Number(e.duration_seconds) || 3, e.should_ring ? 1 : 0]
          );
        }
      }
      inserted++;
    }
    await conn.commit();
    res.json({ ok: true, inserted });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// DELETE /api/special-days?start=...&end=...
router.delete('/', requireAuth, async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'Missing range' });
  const [r] = await pool.query('DELETE FROM special_days WHERE calendar_date BETWEEN ? AND ?', [start, end]);
  res.json({ ok: true, deleted: r.affectedRows });
});

export default router;
