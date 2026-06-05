import React, { useMemo } from 'react';
import TimetableLessonCard from './TimetableLessonCard';
import type { TimetableLesson } from './types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface TimetableCardsGridProps {
  lessons: TimetableLesson[];
  groupByDay?: boolean;
  emptyMessage?: string;
  className?: string;
}

const TimetableCardsGrid: React.FC<TimetableCardsGridProps> = ({
  lessons,
  groupByDay = true,
  emptyMessage = 'No lessons scheduled.',
  className = '',
}) => {
  const grouped = useMemo(() => {
    if (!groupByDay) return [{ day: null as string | null, items: lessons }];

    const map = new Map<string, TimetableLesson[]>();
    for (const lesson of lessons) {
      const day =
        lesson.day ||
        (lesson.dayOfWeek != null ? DAY_NAMES[lesson.dayOfWeek] : 'Other') ||
        'Other';
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(lesson);
    }

    const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Other'];
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map(([day, items]) => ({
        day,
        items: [...items].sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }));
  }, [lessons, groupByDay]);

  if (lessons.length === 0) {
    return (
      <p className={`rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-500 ${className}`}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {grouped.map(({ day, items }) => (
        <section key={day ?? 'all'}>
          {day && groupByDay && (
            <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-widest text-school-blue">
              {day}
            </h3>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((lesson, index) => (
              <TimetableLessonCard
                key={lesson.id ?? `${day}-${lesson.startTime}-${lesson.subject}-${index}`}
                lesson={lesson}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default TimetableCardsGrid;
