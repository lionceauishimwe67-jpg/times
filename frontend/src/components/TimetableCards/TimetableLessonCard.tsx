import React from 'react';
import type { TimetableLesson } from './types';

interface TimetableLessonCardProps {
  lesson: TimetableLesson;
  className?: string;
}

const formatTime = (value: string) => {
  if (!value) return '—';
  return value.length >= 5 ? value.slice(0, 5) : value;
};

const TimetableLessonCard: React.FC<TimetableLessonCardProps> = ({ lesson, className = '' }) => {
  const timeLabel = `${formatTime(lesson.startTime)} – ${formatTime(lesson.endTime)}`;

  return (
    <article
      className={[
        'group relative flex flex-col rounded-xl border bg-white p-4 shadow-card transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-card-hover',
        lesson.isNow
          ? 'border-school-accent ring-2 ring-school-accent/30'
          : 'border-slate-200 hover:border-school-blue/40',
        className,
      ].join(' ')}
    >
      {lesson.isNow && (
        <span className="absolute -top-2 right-3 rounded-full bg-school-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Now
        </span>
      )}

      {lesson.day && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-school-blue/70">
          {lesson.day}
        </p>
      )}

      <h3 className="mb-3 line-clamp-2 text-base font-bold leading-snug text-school-navy sm:text-lg">
        {lesson.subject || 'Unassigned'}
      </h3>

      <div className="mt-auto space-y-2.5 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-school-blue/10 text-school-blue" aria-hidden>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <span className="font-medium text-school-navy">{timeLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700" aria-hidden>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </span>
          <span className="truncate">{lesson.teacher || 'No teacher'}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700" aria-hidden>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </span>
          <span className="truncate">{lesson.room || 'No room'}</span>
        </div>
      </div>
    </article>
  );
};

export default TimetableLessonCard;
