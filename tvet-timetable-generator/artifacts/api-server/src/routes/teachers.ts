import { Router, type IRouter } from "express";
import { db, teachersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListTeachersResponse,
  CreateTeacherBody,
  UpdateTeacherBody,
  UpdateTeacherParams,
  DeleteTeacherParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/teachers", async (_req, res): Promise<void> => {
  const teachers = await db.select().from(teachersTable).orderBy(teachersTable.code);
  res.json(ListTeachersResponse.parse(teachers));
});

router.post("/admin/teachers", async (req, res): Promise<void> => {
  const parsed = CreateTeacherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [teacher] = await db.insert(teachersTable).values(parsed.data).returning();
  res.status(201).json(teacher);
});

router.put("/admin/teachers/:id", async (req, res): Promise<void> => {
  const params = UpdateTeacherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTeacherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [teacher] = await db
    .update(teachersTable)
    .set(parsed.data)
    .where(eq(teachersTable.id, params.data.id))
    .returning();
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }
  res.json(teacher);
});

router.delete("/admin/teachers/:id", async (req, res): Promise<void> => {
  const params = DeleteTeacherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [teacher] = await db
    .delete(teachersTable)
    .where(eq(teachersTable.id, params.data.id))
    .returning();
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
