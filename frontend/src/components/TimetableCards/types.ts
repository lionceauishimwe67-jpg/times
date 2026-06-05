export interface TimetableLesson {
  id?: string | number;
  subject: string;
  startTime: string;
  endTime: string;
  teacher: string;
  room: string;
  day?: string;
  dayOfWeek?: number;
  isNow?: boolean;
}
