import { Router, type IRouter } from "express";
import healthRouter from "./health";
import loansRouter from "./loans";
import borrowersRouter from "./borrowers";
import ratesRouter from "./rates";
import productsRouter from "./products";
import knowledgeRouter from "./knowledge";
import pipelineRouter from "./pipeline";
import escrowRouter from "./escrow";
import helocRouter from "./heloc";
import tasksRouter from "./tasks";
import copilotRouter from "./copilot";

const router: IRouter = Router();

router.use(healthRouter);
router.use(loansRouter);
router.use(borrowersRouter);
router.use(ratesRouter);
router.use(productsRouter);
router.use(knowledgeRouter);
router.use(pipelineRouter);
router.use(escrowRouter);
router.use(helocRouter);
router.use(tasksRouter);
router.use(copilotRouter);

export default router;
