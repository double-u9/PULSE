import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mlPipelineRouter from "./ml-pipeline";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mlPipelineRouter);

export default router;
