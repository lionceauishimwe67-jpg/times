import { Router } from 'express';
import { query, run } from '../config/database';
import { consumeHardwareBellCommand, getCurrentSessionState } from '../schedulers/bellScheduler';

const router = Router();

type BellScheduleItem = {
  id: string;
  time: string;
  label: string;
  type: 'lesson_start' | 'lesson_end';
  duration_seconds: number;
};

const normalizeDate = (value?: unknown): string => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return new Date().toISOString().slice(0, 10);
};

const normalizeTime = (value: string): string => {
  const [hours = '00', minutes = '00', seconds = '00'] = value.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
};

const getDayOfWeek = (dateString: string): number => {
  const date = new Date(`${dateString}T00:00:00`);
  return date.getDay();
};

router.get('/schedule', async (req, res) => {
  try {
    const date = normalizeDate(req.query.date);
    const dayOfWeek = getDayOfWeek(date);

    const specialDays = await query<any[]>(
      `SELECT * FROM special_days WHERE date = ?`,
      [date]
    );

    if (specialDays.length > 0) {
      const specialDay = specialDays[0];
      const specialDayType = specialDay.type || 'holiday';
      if (specialDayType === 'holiday' || !specialDay.is_bell_enabled) {
        return res.json({
          success: true,
          date,
          data: [],
          message: `Bells disabled for ${specialDay.name}`
        });
      }
    }

    const rows = await query<any[]>(
      `SELECT
        tt.id,
        tt.start_time,
        tt.end_time,
        s.name AS subject_name,
        c.name AS class_name
       FROM timetable tt
       JOIN subjects s ON tt.subject_id = s.id
       JOIN classes c ON tt.class_id = c.id
       WHERE tt.day_of_week = ?
       AND tt.is_active = 1
       ORDER BY tt.start_time, tt.end_time`,
      [dayOfWeek]
    );

    const items = new Map<string, BellScheduleItem>();

    for (const row of rows) {
      const startTime = normalizeTime(row.start_time);
      const endTime = normalizeTime(row.end_time);

      items.set(`start-${startTime}`, {
        id: `start-${row.id}`,
        time: startTime,
        label: `${row.class_name} ${row.subject_name} starts`,
        type: 'lesson_start',
        duration_seconds: 15
      });

      items.set(`end-${endTime}`, {
        id: `end-${row.id}`,
        time: endTime,
        label: `${row.class_name} ${row.subject_name} ends`,
        type: 'lesson_end',
        duration_seconds: 15
      });
    }

    const data = Array.from(items.values()).sort((a, b) => a.time.localeCompare(b.time));

    res.json({
      success: true,
      date,
      dayOfWeek,
      data
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/ring-command', async (req, res) => {
  try {
    const currentSession = await getCurrentSessionState();
    const command = await consumeHardwareBellCommand();

    res.json({
      success: true,
      ring: !!command,
      command,
      currentSession
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/heartbeat', async (req, res) => {
  try {
    const deviceId = req.body?.device_id || req.query.device_id || 'mhbell-esp32';
    const ipAddress = req.ip;

    const devices = await query<any[]>(`SELECT id FROM devices WHERE device_id = ?`, [deviceId]);

    if (devices.length === 0) {
      await run(
        `INSERT INTO devices (name, device_type, device_id, ip_address, status, last_seen)
         VALUES (?, 'esp32', ?, ?, 'online', CURRENT_TIMESTAMP)`,
        ['MHBell ESP32', deviceId, ipAddress]
      );
    } else {
      await run(
        `UPDATE devices
         SET status = 'online', ip_address = ?, last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE device_id = ?`,
        [ipAddress, deviceId]
      );
    }

    await run(
      `INSERT INTO device_heartbeats (device_id, heartbeat_time, status)
       VALUES ((SELECT id FROM devices WHERE device_id = ?), CURRENT_TIMESTAMP, 'online')`,
      [deviceId]
    );

    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
