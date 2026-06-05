import { Router, type IRouter } from "express";
import { db, modulesTable, teachersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListModulesResponse,
  ListModulesResponseItem,
  CreateModuleBody,
  UpdateModuleBody,
  UpdateModuleParams,
  DeleteModuleParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/modules", async (_req, res): Promise<void> => {
  const modules = await db.select().from(modulesTable).orderBy(modulesTable.trade, modulesTable.name);
  const teachers = await db.select().from(teachersTable);

  const moduleTeacherMap = new Map<string, typeof teachers[0]>();
  for (const t of teachers) {
    for (const code of t.moduleCodes) {
      moduleTeacherMap.set(code, t);
    }
  }

  const enriched = modules.map((m) => {
    const teacher = moduleTeacherMap.get(m.code);
    return ListModulesResponseItem.parse({
      ...m,
      teacherId: teacher?.id ?? null,
      teacherName: teacher?.name ?? null,
      teacherCode: teacher?.code ?? null,
    });
  });

  res.json(ListModulesResponse.parse(enriched));
});

router.post("/admin/modules", async (req, res): Promise<void> => {
  const parsed = CreateModuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [mod] = await db.insert(modulesTable).values(parsed.data).returning();
  res.status(201).json(mod);
});

router.put("/admin/modules/:id", async (req, res): Promise<void> => {
  const params = UpdateModuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateModuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [mod] = await db.update(modulesTable).set(parsed.data).where(eq(modulesTable.id, params.data.id)).returning();
  if (!mod) {
    res.status(404).json({ error: "Module not found" });
    return;
  }
  res.json(mod);
});

router.delete("/admin/modules/:id", async (req, res): Promise<void> => {
  const params = DeleteModuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [mod] = await db.delete(modulesTable).where(eq(modulesTable.id, params.data.id)).returning();
  if (!mod) {
    res.status(404).json({ error: "Module not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
