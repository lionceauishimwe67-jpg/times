import { query, run } from '../config/database';
import { io } from '../server';
import { globalTimeService } from '../services/globalTimeService';

interface CurrentSession {
  id: number;
  class_name: string;
  subject_name: string;
  teacher_name: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  status: string;
  session_type: 'lesson' | 'break' | 'free' | 'special';
}

interface BellTrigger {
  shouldRing: boolean;
  bellType: 'lesson_start' | 'lesson_end' | 'break_start' | 'break_end' | 'manual';
  reason: string;
  scheduleId?: number;
}

interface HardwareBellCommand {
  id: string;
  ring: true;
  type: BellTrigger['bellType'];
  reason: string;
  duration_seconds: number;
  created_at: string;
  schedule_id: number | null;
}

let schedulerInterval: NodeJS.Timeout | null = null;
let lastCheckedMinute: number = -1;

export const startBellScheduler = () => {
  if (schedulerInterval) {
    console.log('Bell scheduler already running');
    return;
  }

  console.log('Starting unified bell scheduler...');

  // Check every 10 seconds for precise timing
  schedulerInterval = setInterval(async () => {
    try {
      await processBellScheduler();
    } catch (error) {
      console.error('Error in bell scheduler:', error);
    }
  }, 10000);

  console.log('Bell scheduler started - checking every 10 seconds');
};

export const stopBellScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('Bell scheduler stopped');
  }
};

const processBellScheduler = async () => {
  // Use global time service instead of local time
  const timeData = await globalTimeService.getCurrentTime();
  const now = timeData.current_time;
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);

  // Only process if minute changed
  if (currentMinute === lastCheckedMinute) {
    return;
  }
  lastCheckedMinute = currentMinute;

  console.log(`[Bell Scheduler] Processing at ${currentTime} (Day ${currentDay}) - Source: ${timeData.source}`);

  // Check if today is a special day
  const specialDay = await query<any[]>(
    `SELECT * FROM special_days WHERE date = DATE('now')`
  );

  if (specialDay.length > 0) {
    const day = specialDay[0];
    console.log(`[Bell Scheduler] Special day: ${day.name} (${day.type})`);
    
    if (day.type === 'holiday' || !day.is_bell_enabled) {
      console.log('[Bell Scheduler] Bells disabled for special day');
      await updateCurrentSession(null);
      return;
    }
  }

  // Get current session from timetable
  const currentSession = await getCurrentSession(currentDay, currentTime);
  
  // Update current session in system state
  await updateCurrentSession(currentSession);

  // Check if bell should ring
  const bellTrigger = await shouldTriggerBell(currentDay, currentTime, currentSession);
  
  if (bellTrigger.shouldRing) {
    await triggerBell(bellTrigger);
  }

  // Broadcast current session to all connected clients
  io.emit('current-session', currentSession);
  io.emit('countdown', await getCountdown(currentSession));
};

const getCurrentSession = async (dayOfWeek: number, currentTime: string): Promise<CurrentSession | null> => {
  const entries = await query<any[]>(
    `SELECT 
      tt.id,
      tt.start_time,
      tt.end_time,
      tt.day_of_week,
      tt.status,
      c.name AS class_name,
      s.name AS subject_name,
      t.name AS teacher_name
    FROM timetable tt
    JOIN classes c ON tt.class_id = c.id
    JOIN subjects s ON tt.subject_id = s.id
    LEFT JOIN teachers t ON tt.teacher_id = t.id
    WHERE tt.day_of_week = ? 
    AND tt.is_active = 1
    AND tt.start_time <= ? 
    AND tt.end_time > ?
    ORDER BY tt.start_time`,
    [dayOfWeek, currentTime, currentTime]
  );

  if (entries.length === 0) {
    return null;
  }

  // Determine session type based on subject
  const sessionType = getSessionType(entries[0].subject_name);

  return {
    id: entries[0].id,
    class_name: entries[0].class_name,
    subject_name: entries[0].subject_name,
    teacher_name: entries[0].teacher_name || 'No Teacher',
    start_time: entries[0].start_time,
    end_time: entries[0].end_time,
    day_of_week: entries[0].day_of_week,
    status: entries[0].status,
    session_type: sessionType
  };
};

const getSessionType = (subjectName: string): 'lesson' | 'break' | 'free' | 'special' => {
  const upperName = subjectName.toUpperCase();
  
  if (upperName.includes('BREAK') || upperName.includes('LUNCH') || upperName.includes('RECESS')) {
    return 'break';
  }
  
  if (upperName.includes('FREE') || upperName.includes('STUDY') || upperName.includes('SELF')) {
    return 'free';
  }
  
  if (upperName.includes('ASSEMBLY') || upperName.includes('EVENT') || upperName.includes('MEETING')) {
    return 'special';
  }
  
  return 'lesson';
};

const shouldTriggerBell = async (
  dayOfWeek: number, 
  currentTime: string, 
  currentSession: CurrentSession | null
): Promise<BellTrigger> => {
  // Get sessions that start at the current minute.
  // Hardware polls the queued command frequently, so queueing at the exact
  // timetable minute keeps the physical bell aligned with the displayed schedule.
  const startingSessions = await query<any[]>(
    `SELECT tt.id, s.name AS subject_name FROM timetable tt
     JOIN subjects s ON tt.subject_id = s.id
     WHERE tt.day_of_week = ? AND tt.start_time = ? AND tt.is_active = 1`,
    [dayOfWeek, currentTime]
  );

  if (startingSessions.length > 0) {
    const sessionType = getSessionType(startingSessions[0].subject_name);
    return {
      shouldRing: true,
      bellType: sessionType === 'break' ? 'break_start' : 'lesson_start',
      reason: `Session starting: ${startingSessions[0].subject_name}`,
      scheduleId: startingSessions[0].id
    };
  }

  // Get sessions that end at current time
  const endingSessions = await query<any[]>(
    `SELECT tt.id, s.name AS subject_name FROM timetable tt
     JOIN subjects s ON tt.subject_id = s.id
     WHERE tt.day_of_week = ? AND tt.end_time = ? AND tt.is_active = 1`,
    [dayOfWeek, currentTime]
  );

  if (endingSessions.length > 0) {
    const sessionType = getSessionType(endingSessions[0].subject_name);
    return {
      shouldRing: true,
      bellType: sessionType === 'break' ? 'break_end' : 'lesson_end',
      reason: `Session ending: ${endingSessions[0].subject_name}`,
      scheduleId: endingSessions[0].id
    };
  }

  return { shouldRing: false, bellType: 'manual', reason: '' };
};

const triggerBell = async (trigger: BellTrigger) => {
  console.log(`[Bell Scheduler] Triggering bell: ${trigger.bellType} - ${trigger.reason}`);

  await queueHardwareBellCommand(trigger);

  // Log bell trigger
  await run(
    `INSERT INTO bell_logs (bell_type, triggered_by, reason, schedule_id) 
     VALUES (?, 'system', ?, ?)`,
    [trigger.bellType, trigger.reason, trigger.scheduleId || null]
  );

  // Broadcast bell trigger to all connected clients
  io.emit('bell-triggered', {
    type: trigger.bellType,
    reason: trigger.reason,
    timestamp: new Date().toISOString()
  });
};

const queueHardwareBellCommand = async (trigger: BellTrigger) => {
  const command: HardwareBellCommand = {
    id: `${trigger.bellType}-${Date.now()}`,
    ring: true,
    type: trigger.bellType,
    reason: trigger.reason,
    duration_seconds: Number(process.env.BELL_DURATION_SECONDS || 15),
    created_at: new Date().toISOString(),
    schedule_id: trigger.scheduleId || null
  };

  await run(
    `INSERT OR IGNORE INTO system_state (key, value) VALUES ('hardware_ring_command', 'null')`
  );
  await run(
    `UPDATE system_state SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'hardware_ring_command'`,
    [JSON.stringify(command)]
  );
  await run(
    `UPDATE system_state SET value = 'true', updated_at = CURRENT_TIMESTAMP WHERE key = 'manual_ring'`
  );
};

const updateCurrentSession = async (session: CurrentSession | null) => {
  const value = session ? JSON.stringify(session) : 'null';
  await run(
    `UPDATE system_state SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'current_session'`,
    [value]
  );
};

const getCountdown = async (currentSession: CurrentSession | null): Promise<{ seconds: number; target: string } | null> => {
  if (!currentSession) {
    return null;
  }

  const now = new Date();
  const [endHours, endMinutes] = currentSession.end_time.split(':').map(Number);
  const endTime = new Date(now);
  endTime.setHours(endHours, endMinutes, 0, 0);

  const seconds = Math.floor((endTime.getTime() - now.getTime()) / 1000);

  if (seconds > 0) {
    return {
      seconds,
      target: currentSession.end_time
    };
  }

  return null;
};

// Get current session (API helper)
export const getCurrentSessionState = async (): Promise<CurrentSession | null> => {
  const result = await query<any[]>(
    `SELECT value FROM system_state WHERE key = 'current_session'`
  );

  if (result.length === 0 || result[0].value === 'null') {
    return null;
  }

  try {
    return JSON.parse(result[0].value);
  } catch {
    return null;
  }
};

// Manual bell trigger (API helper)
export const triggerManualBell = async () => {
  const trigger: BellTrigger = {
    shouldRing: true,
    bellType: 'manual',
    reason: 'Manual ring requested by admin'
  };
  await queueHardwareBellCommand(trigger);
  await run(
    `INSERT INTO bell_logs (bell_type, triggered_by, reason, schedule_id)
     VALUES ('manual', 'admin', 'Manual ring requested by admin', NULL)`
  );
  io.emit('bell-triggered', {
    type: 'manual',
    reason: 'Manual ring requested by admin',
    timestamp: new Date().toISOString()
  });
  return { success: true };
};

export const consumeHardwareBellCommand = async () => {
  const commands = await query<{ value: string }[]>(
    `SELECT value FROM system_state WHERE key = 'hardware_ring_command'`
  );

  if (commands.length > 0 && commands[0].value && commands[0].value !== 'null') {
    await run(
      `UPDATE system_state SET value = 'null', updated_at = CURRENT_TIMESTAMP WHERE key = 'hardware_ring_command'`
    );
    await run(
      `UPDATE system_state SET value = 'false', updated_at = CURRENT_TIMESTAMP WHERE key = 'manual_ring'`
    );

    try {
      return JSON.parse(commands[0].value);
    } catch {
      return {
        ring: true,
        type: 'manual',
        reason: 'Bell command',
        duration_seconds: Number(process.env.BELL_DURATION_SECONDS || 15)
      };
    }
  }

  const legacyFlag = await query<{ value: string }[]>(
    `SELECT value FROM system_state WHERE key = 'manual_ring'`
  );
  const shouldRing = legacyFlag.length > 0 && legacyFlag[0].value === 'true';

  if (shouldRing) {
    await run(
      `UPDATE system_state SET value = 'false', updated_at = CURRENT_TIMESTAMP WHERE key = 'manual_ring'`
    );
    return {
      ring: true,
      type: 'manual',
      reason: 'Manual ring requested by admin',
      duration_seconds: Number(process.env.BELL_DURATION_SECONDS || 15)
    };
  }

  return null;
};

// Get device status (API helper)
export const getDeviceStatus = async () => {
  const devices = await query<any[]>(
    `SELECT id, name, device_type, device_id, status, last_seen, location 
     FROM devices 
     WHERE device_type = 'esp32'`
  );

  return devices.map(device => ({
    ...device,
    online: device.last_seen && 
      (Date.now() - new Date(device.last_seen).getTime()) < 60000
  }));
};

// Update device heartbeat (API helper)
export const updateDeviceHeartbeat = async (deviceId: string) => {
  const device = await query<any[]>(
    `SELECT id FROM devices WHERE device_id = ?`,
    [deviceId]
  );

  if (device.length === 0) {
    // Create new device
    await run(
      `INSERT INTO devices (name, device_type, device_id, status, last_seen) 
       VALUES (?, 'esp32', ?, 'online', CURRENT_TIMESTAMP)`,
      ['ESP32 Device', deviceId]
    );
  } else {
    // Update existing device
    await run(
      `UPDATE devices SET status = 'online', last_seen = CURRENT_TIMESTAMP 
       WHERE device_id = ?`,
      [deviceId]
    );
  }

  // Log heartbeat
  await run(
    `INSERT INTO device_heartbeats (device_id, heartbeat_time, status) 
     VALUES ((SELECT id FROM devices WHERE device_id = ?), CURRENT_TIMESTAMP, 'online')`,
    [deviceId]
  );

  return { success: true };
};
