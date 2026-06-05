import { Router, type IRouter } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { db, modulesTable, teachersTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function parseFile(buffer: Buffer, mimetype: string): unknown[] {
  const content = buffer.toString("utf-8").trim();
  if (mimetype === "application/json" || content.startsWith("[") || content.startsWith("{")) {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  return parse(content, { columns: true, skip_empty_lines: true, trim: true });
}

router.post("/admin/upload/chronogram", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  let rows: unknown[];
  try {
    rows = parseFile(req.file.buffer, req.file.mimetype);
  } catch (err) {
    req.log.warn({ err }, "Failed to parse chronogram file");
    res.status(400).json({ error: "Failed to parse file. Expected CSV or JSON." });
    return;
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows as Record<string, string>[]) {
    try {
      const code = row["module_code"]?.trim();
      const name = row["module_name"]?.trim();
      const weeklyPeriodsRaw = row["weekly_periods"]?.trim();
      const isSpecificRaw = row["is_specific"]?.trim();
      const trade = row["trade"]?.trim();

      if (!code || !name || !weeklyPeriodsRaw || !trade) {
        errors.push(`Row missing required fields: ${JSON.stringify(row)}`);
        skipped++;
        continue;
      }

      const weeklyPeriods = parseInt(weeklyPeriodsRaw, 10);
      if (isNaN(weeklyPeriods) || weeklyPeriods < 1) {
        errors.push(`Invalid weekly_periods for module ${code}`);
        skipped++;
        continue;
      }

      const isSpecific = isSpecificRaw === "true" || isSpecificRaw === "1";

      await db
        .insert(modulesTable)
        .values({ code, name, weeklyPeriods, isSpecific, trade })
        .onConflictDoUpdate({
          target: modulesTable.code,
          set: { name, weeklyPeriods, isSpecific, trade },
        });
      imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Error processing row: ${msg}`);
      skipped++;
    }
  }

  req.log.info({ imported, skipped }, "Chronogram upload complete");
  res.json({ imported, skipped, errors, message: `Imported ${imported} modules.` });
});

router.post("/admin/upload/teachers", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  let rows: unknown[];
  try {
    rows = parseFile(req.file.buffer, req.file.mimetype);
  } catch (err) {
    req.log.warn({ err }, "Failed to parse teachers file");
    res.status(400).json({ error: "Failed to parse file. Expected CSV or JSON." });
    return;
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows as Record<string, string>[]) {
    try {
      const name = row["teacher_name"]?.trim();
      const code = row["teacher_code"]?.trim();
      const moduleCodesRaw = row["module_codes"]?.trim();

      if (!name || !code) {
        errors.push(`Row missing required fields: ${JSON.stringify(row)}`);
        skipped++;
        continue;
      }

      const moduleCodes = moduleCodesRaw
        ? moduleCodesRaw.split(",").map((c) => c.trim()).filter(Boolean)
        : [];

      await db
        .insert(teachersTable)
        .values({ name, code, moduleCodes })
        .onConflictDoUpdate({
          target: teachersTable.code,
          set: { name, moduleCodes },
        });
      imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Error processing row: ${msg}`);
      skipped++;
    }
  }

  req.log.info({ imported, skipped }, "Teachers upload complete");
  res.json({ imported, skipped, errors, message: `Imported ${imported} teachers.` });
});

export default router;
