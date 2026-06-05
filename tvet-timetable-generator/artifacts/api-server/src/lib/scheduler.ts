import { db } from "@workspace/db";
import {
  classesTable,
  modulesTable,
  teachersTable,
  timetableEntriesTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { logger } from "./logger";

const DAYS = [1, 2, 3, 4, 5]; // Mon-Fri
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const TOTAL_PERIODS_PER_WEEK = 50; // 10 periods × 5 days

type Schedule = Map<string, { moduleId: number | null; teacherId: number | null; type: "module" | "cocurricular" | "free" }>;

function key(day: number, period: number) {
  return `${day}-${period}`;
}

function isFree(schedule: Schedule, day: number, period: number) {
  const cell = schedule.get(key(day, period));
  return !cell || cell.type === "free";
}

function isBlockFree(
  classSchedule: Schedule,
  teacherSchedule: Map<number, Schedule>,
  teacherId: number,
  day: number,
  startPeriod: number,
  blockSize: number
): boolean {
  for (let p = startPeriod; p < startPeriod + blockSize; p++) {
    if (p > 10) return false;
    if (!isFree(classSchedule, day, p)) return false;
    const tSched = teacherSchedule.get(teacherId);
    if (tSched && !isFree(tSched, day, p)) return false;
  }
  return true;
}

function occupyBlock(
  classSchedule: Schedule,
  teacherSchedule: Map<number, Schedule>,
  teacherId: number,
  moduleId: number,
  day: number,
  startPeriod: number,
  blockSize: number
) {
  for (let p = startPeriod; p < startPeriod + blockSize; p++) {
    classSchedule.set(key(day, p), { moduleId, teacherId, type: "module" });
    let tSched = teacherSchedule.get(teacherId);
    if (!tSched) {
      tSched = new Map();
      teacherSchedule.set(teacherId, tSched);
    }
    tSched.set(key(day, p), { moduleId, teacherId, type: "module" });
  }
}

function findFreeBlock(
  classSchedule: Schedule,
  teacherSchedule: Map<number, Schedule>,
  teacherId: number,
  blockSize: number,
  excludedDays: Set<number> = new Set()
): { day: number; startPeriod: number } | null {
  for (const day of DAYS) {
    if (excludedDays.has(day)) continue;
    for (let p = 1; p <= 10 - blockSize + 1; p++) {
      if (isBlockFree(classSchedule, teacherSchedule, teacherId, day, p, blockSize)) {
        return { day, startPeriod: p };
      }
    }
  }
  return null;
}

export async function generateAllTimetables(): Promise<{
  success: boolean;
  classesProcessed: number;
  entriesCreated: number;
  errors: string[];
  message: string;
}> {
  const errors: string[] = [];
  let entriesCreated = 0;

  // Load all data
  const allClasses = await db.select().from(classesTable);
  const allModules = await db.select().from(modulesTable);
  const allTeachers = await db.select().from(teachersTable);

  // Build module → teacher lookup
  const moduleTeacherMap = new Map<string, typeof allTeachers[0]>();
  for (const teacher of allTeachers) {
    for (const code of teacher.moduleCodes) {
      moduleTeacherMap.set(code, teacher);
    }
  }

  // Global teacher schedule across all classes
  const globalTeacherSchedule = new Map<number, Schedule>();

  const entriesToInsert: Array<{
    classId: number;
    day: number;
    period: number;
    moduleId: number | null;
    teacherId: number | null;
    entryType: string;
  }> = [];

  for (const cls of allClasses) {
    // Get modules for this trade
    const tradeModules = allModules.filter((m) => m.trade === cls.trade);

    if (tradeModules.length === 0) {
      logger.warn({ className: cls.name, trade: cls.trade }, "No modules found for trade");
      continue;
    }

    const classSchedule: Schedule = new Map();

    // Sort: specific modules first by weekly_periods descending, then general
    const specificModules = tradeModules
      .filter((m) => m.isSpecific)
      .sort((a, b) => b.weeklyPeriods - a.weeklyPeriods);
    const generalModules = tradeModules.filter((m) => !m.isSpecific);

    // ─── Allocate specific modules ───────────────────────────
    for (const mod of specificModules) {
      const teacher = moduleTeacherMap.get(mod.code);
      if (!teacher) {
        errors.push(`No teacher assigned for module ${mod.code} (${mod.name})`);
        continue;
      }

      let remaining = mod.weeklyPeriods;
      const usedDays = new Set<number>();

      while (remaining > 0) {
        let blockSize: number;
        if (remaining >= 3) blockSize = 3;
        else if (remaining >= 2) blockSize = 2;
        else blockSize = 1;

        let slot = findFreeBlock(classSchedule, globalTeacherSchedule, teacher.id, blockSize, usedDays);

        if (!slot && blockSize > 1) {
          // fallback: try smaller block
          blockSize = blockSize - 1;
          slot = findFreeBlock(classSchedule, globalTeacherSchedule, teacher.id, blockSize, usedDays);
        }
        if (!slot && blockSize > 1) {
          blockSize = 1;
          slot = findFreeBlock(classSchedule, globalTeacherSchedule, teacher.id, 1, usedDays);
        }
        if (!slot) {
          errors.push(
            `Cannot place module ${mod.code} (${mod.name}) for class ${cls.name} — no free slot available (remaining: ${remaining} periods)`
          );
          break;
        }

        occupyBlock(classSchedule, globalTeacherSchedule, teacher.id, mod.id, slot.day, slot.startPeriod, blockSize);
        usedDays.add(slot.day);
        remaining -= blockSize;
      }
    }

    // ─── Allocate general modules (single period each) ───────
    for (const mod of generalModules) {
      const teacher = moduleTeacherMap.get(mod.code);
      if (!teacher) {
        errors.push(`No teacher assigned for module ${mod.code} (${mod.name})`);
        continue;
      }

      let remaining = mod.weeklyPeriods;
      for (const day of DAYS) {
        if (remaining <= 0) break;
        for (const period of PERIODS) {
          if (remaining <= 0) break;
          if (isBlockFree(classSchedule, globalTeacherSchedule, teacher.id, day, period, 1)) {
            occupyBlock(classSchedule, globalTeacherSchedule, teacher.id, mod.id, day, period, 1);
            remaining--;
          }
        }
      }

      if (remaining > 0) {
        errors.push(
          `Could not place all periods for general module ${mod.code} (${mod.name}) in class ${cls.name}. ${remaining} period(s) unplaced.`
        );
      }
    }

    // ─── Fill co-curricular ───────────────────────────────────
    for (const day of DAYS) {
      for (const period of PERIODS) {
        if (isFree(classSchedule, day, period)) {
          classSchedule.set(key(day, period), { moduleId: null, teacherId: null, type: "cocurricular" });
        }
      }
    }

    // Collect all entries for this class
    for (const day of DAYS) {
      for (const period of PERIODS) {
        const cell = classSchedule.get(key(day, period));
        if (cell) {
          entriesToInsert.push({
            classId: cls.id,
            day,
            period,
            moduleId: cell.moduleId,
            teacherId: cell.teacherId,
            entryType: cell.type,
          });
        }
      }
    }
  }

  // Bulk insert all entries
  if (entriesToInsert.length > 0) {
    // Insert in batches of 500
    const batchSize = 500;
    for (let i = 0; i < entriesToInsert.length; i += batchSize) {
      const batch = entriesToInsert.slice(i, i + batchSize);
      await db.insert(timetableEntriesTable).values(batch);
      entriesCreated += batch.length;
    }
  }

  const success = errors.length === 0 || entriesCreated > 0;
  return {
    success,
    classesProcessed: allClasses.length,
    entriesCreated,
    errors,
    message: success
      ? `Generated ${entriesCreated} timetable entries for ${allClasses.length} classes.`
      : "Generation failed with errors.",
  };
}
