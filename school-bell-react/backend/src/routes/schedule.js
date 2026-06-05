import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

// Helper: ensure each day_of_week 0..6 has a row in weekly_schedules
async function ensureWeekRows() {
  for (let d = 0; d < 7; d++) {
    await pool.query(
      'INSERT IGNORE INTO weekly_schedules (day_of_week, is_enabled) VALUES (?, 1)',
      [d]
    );
  }
}

// GET /api/schedule  -> all 7 days
router.get('/', requireAuth, async (req, res) => {
  await ensureWeekRows();
  const [weeks] = await pool.query('SELECT id, day_of_week, is_enabled FROM weekly_schedules ORDER BY day_of_week');
  const result = [];
  for (const w of weeks) {
    const [entries] = await pool.query(
      'SELECT id, ring_time, label, duration_seconds FROM schedule_entries WHERE schedule_id = ? ORDER BY ring_time',
      [w.id]
    );
    result.push({
      day: w.day_of_week,
      day_name: DAYS[w.day_of_week],
      schedule_id: w.id,
      enabled: w.is_enabled === 1,
      entries,
    });
  }
  res.json(result);
});

// PUT /api/schedule/:dayOfWeek  -> replace all entries + enabled flag
router.put('/:dayOfWeek', requireAuth, async (req, res) => {
  const day = Number(req.params.dayOfWeek);
  if (Number.isNaN(day) || day < 0 || day > 6) return res.status(400).json({ error: 'Invalid day' });
  const { is_enabled = true, entries = [] } = req.body || {};

  await ensureWeekRows();
  const [rows] = await pool.query('SELECT id FROM weekly_schedules WHERE day_of_week = ?', [day]);
  const scheduleId = rows[0].id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE weekly_schedules SET is_enabled = ? WHERE id = ?', [is_enabled ? 1 : 0, scheduleId]);
    await conn.query('DELETE FROM schedule_entries WHERE schedule_id = ?', [scheduleId]);
    for (const e of entries) {
      if (!e.ring_time || !e.label) continue;
      await conn.query(
        'INSERT INTO schedule_entries (schedule_id, ring_time, label, duration_seconds) VALUES (?,?,?,?)',
        [scheduleId, e.ring_time, e.label, Number(e.duration_seconds) || 5]
      );
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// POST /api/schedule/copy   { source_day }
router.post('/copy', requireAuth, async (req, res) => {
  const source = Number(req.body?.source_day);
  if (Number.isNaN(source) || source < 0 || source > 6) return res.status(400).json({ error: 'Invalid source day' });

  await ensureWeekRows();
  const [srcRows] = await pool.query('SELECT id FROM weekly_schedules WHERE day_of_week = ?', [source]);
  const [entries] = await pool.query(
    'SELECT ring_time, label, duration_seconds FROM schedule_entries WHERE schedule_id = ?',
    [srcRows[0].id]
  );

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let d = 0; d < 7; d++) {
      if (d === source) continue;
      const [tgt] = await conn.query('SELECT id FROM weekly_schedules WHERE day_of_week = ?', [d]);
      const tgtId = tgt[0].id;
      await conn.query('DELETE FROM schedule_entries WHERE schedule_id = ?', [tgtId]);
      for (const e of entries) {
        await conn.query(
          'INSERT INTO schedule_entries (schedule_id, ring_time, label, duration_seconds) VALUES (?,?,?,?)',
          [tgtId, e.ring_time, e.label, e.duration_seconds]
        );
      }
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/schedule/today  -> today's entries (special day overrides weekly)
router.get('/today', requireAuth, async (req, res) => {
  const today = new Date();
  const isoDate = today.toISOString().slice(0, 10);
  const dayIdx = (today.getDay() + 6) % 7; // JS: 0=Sun..6=Sat -> our 0=Mon..6=Sun

  const [special] = await pool.query(
    'SELECT id, label, is_enabled FROM special_days WHERE calendar_date = ?',
    [isoDate]
  );

  if (special.length && special[0].is_enabled === 1) {
    const [entries] = await pool.query(
      'SELECT ring_time, label, duration_seconds FROM schedule_entries WHERE special_day_id = ? ORDER BY ring_time',
      [special[0].id]
    );
    return res.json({
      date: isoDate, day_name: DAYS[dayIdx],
      special: { label: special[0].label }, entries,
    });
  }

  const [entries] = await pool.query(
    `SELECT se.ring_time, se.label, se.duration_seconds
     FROM schedule_entries se
     JOIN weekly_schedules ws ON ws.id = se.schedule_id
     WHERE ws.day_of_week = ? AND ws.is_enabled = 1
     ORDER BY se.ring_time`,
    [dayIdx]
  );
  res.json({ date: isoDate, day_name: DAYS[dayIdx], special: null, entries });
});

export default router;
