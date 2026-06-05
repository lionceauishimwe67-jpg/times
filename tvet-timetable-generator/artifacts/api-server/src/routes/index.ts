import { Router, type IRouter } from "express";
import healthRouter from "./health";
import classesRouter from "./classes";
import modulesRouter from "./modules";
import teachersRouter from "./teachers";
import uploadRouter from "./upload";
import timetablesRouter from "./timetables";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(classesRouter);
router.use(modulesRouter);
router.use(teachersRouter);
router.use(uploadRouter);
router.use(timetablesRouter);
router.use(statsRouter);

export default router;
