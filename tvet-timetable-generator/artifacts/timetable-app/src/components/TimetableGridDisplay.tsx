import React from "react";
import { TIME_SLOTS, DAYS } from "../lib/constants";

interface Props {
  cells: any[];
  isTeacher?: boolean;
}

function getCellBg(type: string): string {
  if (type === "cocurricular") return "bg-amber-50 dark:bg-amber-950/30";
  if (type === "module") return "bg-white dark:bg-card";
  return "bg-muted/20";
}

export default function TimetableGridDisplay({ cells, isTeacher }: Props) {
  const getCell = (period: number, day: number) =>
    cells.find((c) => c.period === period && c.day === day);

  return (
    <div className="w-full overflow-x-auto timetable-grid print:text-xs">
      <table className="w-full border-collapse text-sm text-center min-w-[800px]">
        <thead>
          <tr>
            <th className="border p-2 bg-primary text-primary-foreground font-semibold w-28 whitespace-nowrap">
              Period / Time
            </th>
            {DAYS.map((day) => (
              <th
                key={day.id}
                className="border p-2 bg-primary text-primary-foreground font-semibold min-w-[140px]"
              >
                {day.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIME_SLOTS.map((slot, idx) => {
            if (slot.isBreak) {
              return (
                <tr key={`break-${idx}`} className="bg-slate-100 dark:bg-slate-800/50">
                  <td className="border p-1.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {slot.time}
                  </td>
                  <td
                    colSpan={5}
                    className="border p-1.5 text-xs font-bold tracking-widest text-muted-foreground uppercase text-center"
                  >
                    — {slot.label} —
                  </td>
                </tr>
              );
            }

            return (
              <tr key={`p-${slot.period}`}>
                <td className="border p-2 text-xs font-semibold text-muted-foreground whitespace-nowrap bg-muted/30">
                  <div className="font-bold text-foreground">P{slot.period}</div>
                  <div className="text-[10px]">{slot.time}</div>
                </td>
                {DAYS.map((day) => {
                  const cell = getCell(slot.period!, day.id);
                  const bg = cell ? getCellBg(cell.type) : "bg-muted/10";
                  return (
                    <td
                      key={`${slot.period}-${day.id}`}
                      className={`border p-2 h-16 align-middle ${bg}`}
                    >
                      {!cell || cell.type === "free" ? (
                        <span className="text-muted-foreground text-xs">–</span>
                      ) : cell.type === "cocurricular" ? (
                        <span className="text-amber-700 dark:text-amber-400 text-xs font-medium italic">
                          Co-curricular
                        </span>
                      ) : isTeacher ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-primary text-xs leading-tight">
                            {cell.className}
                          </span>
                          <span className="text-[11px] text-muted-foreground leading-tight">
                            {cell.moduleName}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-primary text-xs leading-tight">
                            {cell.moduleName}
                          </span>
                          {cell.teacherCode && (
                            <span className="text-[11px] font-mono text-muted-foreground">
                              ({cell.teacherCode})
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
