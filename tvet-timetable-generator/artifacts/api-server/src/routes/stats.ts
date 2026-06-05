import { Router, type IRouter } from "express";
import { db, classesTable, modulesTable, teachersTable, timetableEntriesTable, generationLogsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [classCount] = await db.select({ count: sql<number>`count(*)::int` }).from(classesTable);
  const [moduleCount] = await db.select({ count: sql<number>`count(*)::int` }).from(modulesTable);
  const [teacherCount] = await db.select({ count: sql<number>`count(*)::int` }).from(teachersTable);
  const [entryCount] = await db.select({ count: sql<number>`count(*)::int` }).from(timetableEntriesTable);

  // Classes with at least one entry
  const classesWithEntries = await db
    .selectDistinct({ classId: timetableEntriesTable.classId })
    .from(timetableEntriesTable);
  const classesWithTimetables = classesWithEntries.length;

  const [lastLog] = await db
    .select()
    .from(generationLogsTable)
    .orderBy(sql`created_at desc`)
    .limit(1);

  res.json({
    totalClasses: classCount?.count ?? 0,
    totalModules: moduleCount?.count ?? 0,
    totalTeachers: teacherCount?.count ?? 0,
    totalEntries: entryCount?.count ?? 0,
    classesWithTimetables,
    classesWithoutTimetables: Math.max(0, (classCount?.count ?? 0) - classesWithTimetables),
    lastGeneratedAt: lastLog?.createdAt?.toISOString() ?? null,
  });
});

router.get("/admin/logs", async (_req, res): Promise<void> => {
  const logs = await db
    .select()
    .from(generationLogsTable)
    .orderBy(sql`created_at desc`)
    .limit(50);
  res.json(
    logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    }))
  );
});

export default router;
