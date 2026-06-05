import { Router, type IRouter } from "express";
import { db, classesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListClassesResponse,
  CreateClassBody,
  UpdateClassBody,
  UpdateClassParams,
  DeleteClassParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/classes", async (_req, res): Promise<void> => {
  const classes = await db.select().from(classesTable).orderBy(classesTable.level, classesTable.name);
  res.json(ListClassesResponse.parse(classes));
});

router.post("/admin/classes", async (req, res): Promise<void> => {
  const parsed = CreateClassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cls] = await db.insert(classesTable).values(parsed.data).returning();
  res.status(201).json(cls);
});

router.put("/admin/classes/:id", async (req, res): Promise<void> => {
  const params = UpdateClassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateClassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cls] = await db.update(classesTable).set(parsed.data).where(eq(classesTable.id, params.data.id)).returning();
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  res.json(cls);
});

router.delete("/admin/classes/:id", async (req, res): Promise<void> => {
  const params = DeleteClassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [cls] = await db.delete(classesTable).where(eq(classesTable.id, params.data.id)).returning();
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
