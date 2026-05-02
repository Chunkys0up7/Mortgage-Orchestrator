import { Router, type IRouter, type Request, type Response } from "express";
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNodeExpressEndpoint,
} from "@copilotkit/runtime";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

const runtime = new CopilotRuntime();

const serviceAdapter = new OpenAIAdapter({
  openai: openai as unknown as ConstructorParameters<typeof OpenAIAdapter>[0]["openai"],
  model: "gpt-4o",
});

const copilotHandler = copilotRuntimeNodeExpressEndpoint({
  endpoint: "/api/copilot",
  runtime,
  serviceAdapter,
});

// CopilotKit's Hono router matches on the full path (basePath = "/api/copilot").
// Express strips the matched prefix from req.url, so we restore req.originalUrl
// before handing off so Hono can correctly match /api/copilot and /api/copilot/info.
router.all("/copilot", (req: Request, res: Response) => {
  req.url = req.originalUrl;
  (copilotHandler as (req: Request, res: Response) => void)(req, res);
});

router.all("/copilot/*splat", (req: Request, res: Response) => {
  req.url = req.originalUrl;
  (copilotHandler as (req: Request, res: Response) => void)(req, res);
});

export default router;
