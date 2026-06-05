import type { TimetableLesson } from './types';

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface NamedTimetableEntry {
  id?: number | string;
  subject_name?: string;
  subject?: string;
  teacher_name?: string;
  teacher?: string;
  classroom_name?: string;
  room?: string;
  class_name?: string;
  start_time: string;
  end_time: string;
  day_of_week?: number;
  day?: string;
}

export interface IdBasedEntry {
  id?: number | string;
  subject_id: number;
  teacher_id: number;
  classroom_id: number;
  start_time: string;
  end_time: string;
  day_of_week: number;
}

export interface RefLookup {
  subjects?: Array<{ id: number; name: string }>;
  teachers?: Array<{ id: number; name: string }>;
  classrooms?: Array<{ id: number; name: string }>;
}

export function mapNamedEntryToLesson(
  entry: NamedTimetableEntry,
  index: number,
  options?: { isNow?: boolean }
): TimetableLesson {
  const day =
    entry.day ||
    (entry.day_of_week != null ? DAY_NAMES[entry.day_of_week] : undefined);

  return {
    id: entry.id ?? `lesson-${index}`,
    subject: entry.subject_name || entry.subject || 'Unknown',
    startTime: entry.start_time,
    endTime: entry.end_time,
    teacher: entry.teacher_name || entry.teacher || 'Unassigned',
    room: entry.classroom_name || entry.room || '—',
    day,
    dayOfWeek: entry.day_of_week,
    isNow: options?.isNow,
  };
}

export function mapIdEntriesToLessons(
  entries: IdBasedEntry[],
  ref: RefLookup
): TimetableLesson[] {
  const subjectName = (id: number) =>
    ref.subjects?.find((s) => s.id === id)?.name || 'Unknown';
  const teacherName = (id: number) =>
    ref.teachers?.find((t) => t.id === id)?.name || 'Unassigned';
  const roomName = (id: number) =>
    ref.classrooms?.find((c) => c.id === id)?.name || '—';

  return entries.map((e, index) => ({
    id: e.id ?? `${e.day_of_week}-${e.start_time}-${index}`,
    subject: subjectName(e.subject_id),
    startTime: e.start_time,
    endTime: e.end_time,
    teacher: teacherName(e.teacher_id),
    room: roomName(e.classroom_id),
    day: DAY_NAMES[e.day_of_week],
    dayOfWeek: e.day_of_week,
  }));
}

export function flattenWeeklyToLessons(
  weeklyData: Record<number, NamedTimetableEntry[]>,
  dayFilter?: number
): TimetableLesson[] {
  const lessons: TimetableLesson[] = [];
  const days = dayFilter != null ? [dayFilter] : Object.keys(weeklyData).map(Number);

  for (const day of days) {
    const entries = weeklyData[day] || [];
    entries.forEach((entry, index) => {
      lessons.push(
        mapNamedEntryToLesson({ ...entry, day_of_week: day }, lessons.length + index)
      );
    });
  }

  return lessons;
}
