import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, escrowAccountsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/escrow", async (_req, res): Promise<void> => {
  const accounts = await db.select().from(escrowAccountsTable)
    .orderBy(asc(escrowAccountsTable.nextDisbursementDate));
  res.json(accounts.map(toNum));
});

router.get("/escrow/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const [account] = await db.select().from(escrowAccountsTable).where(eq(escrowAccountsTable.id, id));
  if (!account) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toNum(account));
});

router.post("/escrow", async (req, res): Promise<void> => {
  const { loanId, loanNumber, borrowerName, propertyAddress,
          propertyTaxAnnual, insuranceAnnual, hoaAnnual } = req.body;
  const monthly = ((Number(propertyTaxAnnual) + Number(insuranceAnnual) + Number(hoaAnnual ?? 0)) / 12);
  const [account] = await db.insert(escrowAccountsTable).values({
    loanId, loanNumber, borrowerName, propertyAddress,
    propertyTaxAnnual: String(propertyTaxAnnual),
    insuranceAnnual: String(insuranceAnnual),
    hoaAnnual: String(hoaAnnual ?? 0),
    monthlyEscrowPayment: String(monthly.toFixed(2)),
    balance: "0",
    status: "active",
  }).returning();
  res.status(201).json(toNum(account));
});

router.patch("/escrow/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const allowed = ["balance", "status", "nextDisbursementDate", "nextDisbursementType",
                   "nextDisbursementAmount", "lastAnalysisDate", "propertyTaxAnnual",
                   "insuranceAnnual", "hoaAnnual", "monthlyEscrowPayment"];
  const updates: Record<string, string> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = String(req.body[key]);
  }
  const [account] = await db.update(escrowAccountsTable)
    .set(updates)
    .where(eq(escrowAccountsTable.id, id)).returning();
  if (!account) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toNum(account));
});

function toNum(a: typeof escrowAccountsTable.$inferSelect) {
  return {
    ...a,
    propertyTaxAnnual: Number(a.propertyTaxAnnual),
    insuranceAnnual: Number(a.insuranceAnnual),
    hoaAnnual: Number(a.hoaAnnual),
    monthlyEscrowPayment: Number(a.monthlyEscrowPayment),
    balance: Number(a.balance),
    nextDisbursementAmount: a.nextDisbursementAmount ? Number(a.nextDisbursementAmount) : null,
  };
}

export default router;
