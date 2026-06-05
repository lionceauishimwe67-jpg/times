import { Router, type IRouter } from "express";
import { db, timetableEntriesTable, classesTable, modulesTable, teachersTable, generationLogsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { generateAllTimetables } from "../lib/scheduler";
import {
  GetClassTimetableParams,
  GetTeacherTimetableParams,
  DeleteClassTimetableParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ─── Generate ────────────────────────────────────────────────
router.post("/admin/generate", async (req, res): Promise<void> => {
  req.log.info("Starting timetable generation");

  // Delete existing entries first
  await db.delete(timetableEntriesTable);

  const result = await generateAllTimetables();

  // Log to DB
  await db.insert(generationLogsTable).values({
    success: result.success,
    classesProcessed: result.classesProcessed,
    entriesCreated: result.entriesCreated,
    errors: result.errors,
    message: result.message,
  });

  req.log.info({ result }, "Timetable generation complete");
  res.json(result);
});

// ─── Delete all ──────────────────────────────────────────────
router.delete("/admin/timetables", async (_req, res): Promise<void> => {
  await db.delete(timetableEntriesTable);
  res.sendStatus(204);
});

// ─── Delete by class ──────────────────────────────────────────
router.delete("/admin/timetables/:classId", async (req, res): Promise<void> => {
  const params = DeleteClassTimetableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(timetableEntriesTable)
    .where(eq(timetableEntriesTable.classId, params.data.classId));
  res.sendStatus(204);
});

// ─── Class timetable ──────────────────────────────────────────
router.get("/timetable/class/:classId", async (req, res): Promise<void> => {
  const params = GetClassTimetableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, params.data.classId));
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }

  const entries = await db
    .select()
    .from(timetableEntriesTable)
    .where(eq(timetableEntriesTable.classId, params.data.classId));

  const modules = await db.select().from(modulesTable);
  const teachers = await db.select().from(teachersTable);

  const moduleMap = new Map(modules.map((m) => [m.id, m]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));

  // Track blocks per module per day to show "block 1/2", "cont." labels
  const blockTracker = new Map<string, number>();

  const cells = entries.map((entry) => {
    const mod = entry.moduleId ? moduleMap.get(entry.moduleId) : null;
    const teacher = entry.teacherId ? teacherMap.get(entry.teacherId) : null;

    let blockLabel: string | null = null;
    if (entry.entryType === "module" && mod) {
      const bKey = `${mod.id}-${entry.day}`;
      const count = (blockTracker.get(bKey) ?? 0) + 1;
      blockTracker.set(bKey, count);
      if (count === 1 && mod.weeklyPeriods > 1) {
        blockLabel = `block start`;
      } else if (count > 1) {
        blockLabel = `cont.`;
      }
    }

    return {
      period: entry.period,
      day: entry.day,
      type: entry.entryType as "module" | "cocurricular" | "free",
      moduleName: mod?.name ?? null,
      moduleCode: mod?.code ?? null,
      teacherCode: teacher?.code ?? null,
      teacherName: teacher?.name ?? null,
      blockLabel,
    };
  });

  res.json({
    classId: cls.id,
    className: cls.name,
    trade: cls.trade,
    cells,
  });
});

// ─── Teacher timetable ────────────────────────────────────────
router.get("/timetable/teacher/:teacherId", async (req, res): Promise<void> => {
  const params = GetTeacherTimetableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, params.data.teacherId));
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }

  const entries = await db
    .select()
    .from(timetableEntriesTable)
    .where(eq(timetableEntriesTable.teacherId, params.data.teacherId));

  const modules = await db.select().from(modulesTable);
  const classes = await db.select().from(classesTable);

  const moduleMap = new Map(modules.map((m) => [m.id, m]));
  const classMap = new Map(classes.map((c) => [c.id, c]));

  const cells = entries.map((entry) => {
    const mod = entry.moduleId ? moduleMap.get(entry.moduleId) : null;
    const cls = classMap.get(entry.classId);
    return {
      period: entry.period,
      day: entry.day,
      className: cls?.name ?? null,
      moduleName: mod?.name ?? null,
      moduleCode: mod?.code ?? null,
    };
  });

  res.json({
    teacherId: teacher.id,
    teacherName: teacher.name,
    teacherCode: teacher.code,
    cells,
  });
});

export default router;
