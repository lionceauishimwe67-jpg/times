import type { SchoolTimeSlot } from '../config/schoolTimetableFormat';

/** Normalize HH:MM or HH:MM:SS to HH:MM (zero-padded) */
export function normalizeTime(t: string): string {
  const s = String(t || '').trim();
  const parts = s.split(':');
  if (parts.length < 2) return s.slice(0, 5);
  const h = parts[0].padStart(2, '0');
  const m = (parts[1] || '0').padStart(2, '0');
  return `${h}:${m}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = normalizeTime(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function entryKey(e: { day_of_week: number; start_time: string; end_time: string }): string {
  return `${Number(e.day_of_week)}|${normalizeTime(e.start_time)}|${normalizeTime(e.end_time)}`;
}

/**
 * Match a DB/generation entry to a school grid slot.
 * Tries exact times, then start-only, then overlap (fixes missing cells when end_time differs slightly).
 */
export function findEntryForSchoolSlot<T extends {
  day_of_week: number;
  start_time: string;
  end_time: string;
}>(
  entries: T[],
  day: number,
  slot: SchoolTimeSlot,
  used?: Set<string>
): T | null {
  const dayNum = Number(day);
  const dayEntries = entries.filter((e) => Number(e.day_of_week) === dayNum);

  const take = (entry: T | undefined): T | null => {
    if (!entry) return null;
    const k = entryKey(entry);
    if (used?.has(k)) return null;
    used?.add(k);
    return entry;
  };

  const exact = dayEntries.find(
    (e) =>
      normalizeTime(e.start_time) === slot.startTime &&
      normalizeTime(e.end_time) === slot.endTime
  );
  const fromExact = take(exact);
  if (fromExact) return fromExact;

  const byStart = dayEntries.find((e) => normalizeTime(e.start_time) === slot.startTime);
  const fromStart = take(byStart);
  if (fromStart) return fromStart;

  const slotStart = timeToMinutes(slot.startTime);
  const slotEnd = timeToMinutes(slot.endTime);
  const overlap = dayEntries.find((e) => {
    const s = timeToMinutes(e.start_time);
    return s >= slotStart && s < slotEnd;
  });
  return take(overlap);
}
