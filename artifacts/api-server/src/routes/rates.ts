import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, mortgageRatesTable } from "@workspace/db";
import { GetRatesQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/rates", async (req, res): Promise<void> => {
  const parsed = GetRatesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { productType } = parsed.data;
  const rates = await db.select().from(mortgageRatesTable)
    .where(productType ? eq(mortgageRatesTable.productType, productType) : undefined)
    .orderBy(mortgageRatesTable.productType, mortgageRatesTable.term);
  res.json(rates.map(r => ({
    ...r,
    rate: Number(r.rate),
    apr: Number(r.apr),
    points: Number(r.points),
  })));
});

router.get("/rates/history", async (_req, res): Promise<void> => {
  // Generate 30 days of mock historical rate data
  const history = [];
  const today = new Date();
  const base30 = 6.875;
  const base15 = 6.125;
  const baseArm = 6.25;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const jitter = (Math.sin(i * 0.4) * 0.15) + (Math.cos(i * 0.7) * 0.08);
    history.push({
      date: d.toISOString().split("T")[0],
      rate30yr: Math.round((base30 + jitter) * 1000) / 1000,
      rate15yr: Math.round((base15 + jitter * 0.9) * 1000) / 1000,
      rateArm5: Math.round((baseArm + jitter * 1.1) * 1000) / 1000,
    });
  }
  res.json(history);
});

export default router;
