import React, { useMemo } from 'react';
import {
  SCHOOL_TIMETABLE_HEADER,
  DAY_COLUMNS,
  STANDARD_SCHOOL_SLOTS,
  formatTimeRange,
  type SchoolTimeSlot,
} from '../../config/schoolTimetableFormat';
import { findEntryForSchoolSlot } from '../../utils/timetableSlotMatch';
import './SchoolTimetableGrid.css';

export interface GridEntry {
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_name?: string;
  teacher_name?: string;
  classroom_name?: string;
  subject_id?: number;
  teacher_id?: number;
  classroom_id?: number;
}

interface SchoolTimetableGridProps {
  entries: GridEntry[];
  slots?: SchoolTimeSlot[];
  schoolName?: string;
  academicYear?: string;
  term?: string;
  className?: string;
  getSubjectName?: (subjectId: number) => string;
  getTeacherName?: (teacherId: number) => string;
  getClassroomName?: (classroomId: number) => string;
}

function cellContent(
  slot: SchoolTimeSlot,
  day: number,
  entry: GridEntry | null,
  getSubjectName?: (id: number) => string,
  getTeacherName?: (id: number) => string,
  getClassroomName?: (id: number) => string
): string {
  if (slot.isAssembly) return 'ASSEMBLY';
  if (slot.isBreak) return 'BREAK';
  if (slot.isLunch) return 'LUNCH';
  const fixed = slot.fixedByDay?.[day as 1 | 2 | 3 | 4 | 5];
  if (fixed) return fixed;
  if (!entry) return '';
  const subj =
    entry.subject_name ||
    (entry.subject_id && getSubjectName ? getSubjectName(entry.subject_id) : '');
  const teach =
    entry.teacher_name ||
    (entry.teacher_id && getTeacherName ? getTeacherName(entry.teacher_id) : '');
  const room =
    entry.classroom_name ||
    (entry.classroom_id && getClassroomName ? getClassroomName(entry.classroom_id) : '');

  return [subj, teach, room].filter(Boolean).join('\n');
}

const SchoolTimetableGrid: React.FC<SchoolTimetableGridProps> = ({
  entries,
  slots = STANDARD_SCHOOL_SLOTS,
  schoolName = SCHOOL_TIMETABLE_HEADER.schoolName,
  academicYear = SCHOOL_TIMETABLE_HEADER.academicYear,
  term = SCHOOL_TIMETABLE_HEADER.term,
  className,
  getSubjectName,
  getTeacherName,
  getClassroomName,
}) => {
  const grid = useMemo(() => {
    const used = new Set<string>();
    const byDay: Record<number, Record<number, GridEntry | null>> = {};
    for (const col of DAY_COLUMNS) {
      byDay[col.dayOfWeek] = {};
      slots.forEach((slot, si) => {
        byDay[col.dayOfWeek][si] = findEntryForSchoolSlot(entries, col.dayOfWeek, slot, used);
      });
    }
    return byDay;
  }, [entries, slots]);

  return (
    <div className="stg-wrap">
      <div className="stg-title-row">
        <div className="stg-title-left">{schoolName}</div>
        <div className="stg-title-center">{academicYear}</div>
        <div className="stg-title-right">{SCHOOL_TIMETABLE_HEADER.title}</div>
      </div>
      <div className="stg-meta-row">
        <div className="stg-trainers">{SCHOOL_TIMETABLE_HEADER.trainersLabel}</div>
        {className && <div className="stg-class">Class: {className}</div>}
        <div className="stg-term">{term}</div>
      </div>

      <div className="stg-table-scroll">
        <table className="stg-table">
          <thead>
            <tr>
              <th className="stg-time-col">Time / period</th>
              {DAY_COLUMNS.map((d) => (
                <th key={d.dayOfWeek} style={{ backgroundColor: d.headerColor }}>
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, si) => {
              const spanAll =
                slot.isAssembly || slot.isBreak || slot.isLunch;
              const rowClass = [
                slot.isAssembly && 'stg-row-assembly',
                slot.isBreak && 'stg-row-break',
                slot.isLunch && 'stg-row-lunch',
              ]
                .filter(Boolean)
                .join(' ');

              if (spanAll) {
                const label = slot.isAssembly
                  ? 'ASSEMBLY'
                  : slot.isBreak
                    ? 'BREAK'
                    : 'LUNCH';
                return (
                  <tr key={si} className={rowClass}>
                    <td className="stg-time-cell">{formatTimeRange(slot)}</td>
                    <td colSpan={5} className="stg-span-cell">
                      {label}
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={si} className={rowClass}>
                  <td className="stg-time-cell">{formatTimeRange(slot)}</td>
                  {DAY_COLUMNS.map((d) => {
                    const entry = grid[d.dayOfWeek]?.[si] ?? null;
                    const text = cellContent(
                      slot,
                      d.dayOfWeek,
                      entry,
                      getSubjectName,
                      getTeacherName,
                      getClassroomName
                    );
                    const isFixed = Boolean(
                      slot.fixedByDay?.[d.dayOfWeek as 1 | 2 | 3 | 4 | 5]
                    );
                    return (
                      <td
                        key={d.dayOfWeek}
                        className={`stg-cell ${entry ? 'stg-filled' : ''} ${isFixed ? 'stg-fixed' : ''}`}
                      >
                        {text.split('\n').map((line, i) => (
                          <div key={i} className={i === 0 ? 'stg-subj' : 'stg-teach'}>
                            {line}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SchoolTimetableGrid;
