/**
 * Standard school timetable grid (LYCEE-style)
 * Time/period | Mon | Tue | Wed | Thu | Fri
 */

export interface SchoolTimeSlot {
  label: string;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
  isLunch?: boolean;
  isAssembly?: boolean;
  /** Fixed activity label per day (e.g. DEBATE on Tuesday) — not filled by AI */
  fixedByDay?: Partial<Record<1 | 2 | 3 | 4 | 5, string>>;
  /** If true, AI assigns subjects only in this row */
  teachable?: boolean;
}

export const SCHOOL_TIMETABLE_HEADER = {
  schoolName: 'LYCEE SAINT ALEXANDRE SAULI DE MUHURA.',
  academicYear: '2024-2025',
  title: 'SCHOOL TIMETABLE',
  trainersLabel: "TRAINER'S NAMES: .......",
  term: 'TERM I',
};

export const DAY_COLUMNS = [
  { dayOfWeek: 1 as const, label: 'Monday', headerColor: '#7eb8da' },
  { dayOfWeek: 2 as const, label: 'Tuesday', headerColor: '#92d050' },
  { dayOfWeek: 3 as const, label: 'Wednesday', headerColor: '#ffff00' },
  { dayOfWeek: 4 as const, label: 'Thursday', headerColor: '#f4a6a6' },
  { dayOfWeek: 5 as const, label: 'Friday', headerColor: '#c5b3e6' },
];

export const STANDARD_SCHOOL_SLOTS: SchoolTimeSlot[] = [
  { label: 'ASSEMBLY', startTime: '07:50', endTime: '08:10', isAssembly: true, teachable: false },
  { label: 'Period 1', startTime: '08:10', endTime: '08:50', teachable: true },
  { label: 'Period 2', startTime: '08:50', endTime: '09:30', teachable: true },
  { label: 'Period 3', startTime: '09:30', endTime: '10:10', teachable: true },
  { label: 'BREAK', startTime: '10:10', endTime: '10:25', isBreak: true, teachable: false },
  { label: 'Period 4', startTime: '10:25', endTime: '11:05', teachable: true },
  { label: 'Period 5', startTime: '11:05', endTime: '11:55', teachable: true },
  { label: 'Period 6', startTime: '11:55', endTime: '12:25', teachable: true },
  { label: 'LUNCH', startTime: '12:25', endTime: '13:30', isLunch: true, teachable: false },
  { label: 'Period 7', startTime: '13:30', endTime: '14:10', teachable: true },
  { label: 'Period 8', startTime: '14:10', endTime: '14:50', teachable: true },
  { label: 'Period 9', startTime: '14:50', endTime: '15:30', teachable: true },
  { label: 'BREAK', startTime: '15:30', endTime: '15:40', isBreak: true, teachable: false },
  { label: 'Period 10', startTime: '15:40', endTime: '16:20', teachable: true },
  {
    label: 'Afternoon',
    startTime: '16:20',
    endTime: '17:00',
    teachable: false,
    fixedByDay: { 2: 'DEBATE', 3: 'CPD', 5: 'SPORT' },
  },
];

export function isTeachableSlot(slot: SchoolTimeSlot): boolean {
  if (slot.teachable === false) return false;
  if (slot.isBreak || slot.isLunch || slot.isAssembly) return false;
  if (slot.fixedByDay && Object.keys(slot.fixedByDay).length > 0) return false;
  return true;
}

export function formatTimeRange(slot: SchoolTimeSlot): string {
  return `${slot.startTime} - ${slot.endTime}`;
}

export function slotsToChronoPayload(slots: SchoolTimeSlot[]) {
  return slots.map((s) => ({
    label: s.label,
    startTime: s.startTime,
    endTime: s.endTime,
    isBreak: Boolean(s.isBreak),
    isLunch: Boolean(s.isLunch),
  }));
}

/** Fixed school slots — not editable by users */
export const FIXED_SCHOOL_CHRONO_SLOTS = slotsToChronoPayload(STANDARD_SCHOOL_SLOTS);
