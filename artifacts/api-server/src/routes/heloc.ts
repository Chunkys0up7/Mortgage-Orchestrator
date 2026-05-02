import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, helocAccountsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/heloc", async (_req, res): Promise<void> => {
  const accounts = await db.select().from(helocAccountsTable)
    .orderBy(desc(helocAccountsTable.createdAt));
  res.json(accounts.map(toNum));
});

router.get("/heloc/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const [account] = await db.select().from(helocAccountsTable).where(eq(helocAccountsTable.id, id));
  if (!account) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toNum(account));
});

router.post("/heloc", async (req, res): Promise<void> => {
  const body = req.body;
  const loanNum = `PB-HELOC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`;
  const [account] = await db.insert(helocAccountsTable).values({
    loanNumber: body.loanNumber ?? loanNum,
    borrowerId: body.borrowerId,
    borrowerName: body.borrowerName,
    propertyAddress: body.propertyAddress,
    creditLimit: String(body.creditLimit),
    availableCredit: String(body.creditLimit),
    drawnAmount: "0",
    interestRate: String(body.interestRate),
    drawPeriodEnd: body.drawPeriodEnd,
    repaymentPeriodEnd: body.repaymentPeriodEnd,
    ltv: body.ltv ? String(body.ltv) : null,
    minimumPayment: body.minimumPayment ? String(body.minimumPayment) : null,
    nextPaymentAmount: body.nextPaymentAmount ? String(body.nextPaymentAmount) : null,
    stage: "application",
    status: "pending",
    loanOfficer: body.loanOfficer,
    processor: body.processor ?? null,
    creditScore: body.creditScore ?? null,
  }).returning();
  res.status(201).json(toNum(account));
});

router.patch("/heloc/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const numericFields = ["creditLimit", "availableCredit", "drawnAmount", "interestRate",
                         "ltv", "minimumPayment", "nextPaymentAmount"];
  const updates: Record<string, string | null> = {};
  for (const [key, val] of Object.entries(req.body)) {
    if (val !== undefined) {
      updates[key] = numericFields.includes(key) && val !== null ? String(val) : (val as string | null);
    }
  }
  const [account] = await db.update(helocAccountsTable)
    .set(updates)
    .where(eq(helocAccountsTable.id, id)).returning();
  if (!account) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toNum(account));
});

function toNum(a: typeof helocAccountsTable.$inferSelect) {
  return {
    ...a,
    creditLimit: Number(a.creditLimit),
    availableCredit: Number(a.availableCredit),
    drawnAmount: Number(a.drawnAmount),
    interestRate: Number(a.interestRate),
    ltv: a.ltv ? Number(a.ltv) : null,
    minimumPayment: a.minimumPayment ? Number(a.minimumPayment) : null,
    nextPaymentAmount: a.nextPaymentAmount ? Number(a.nextPaymentAmount) : null,
  };
}

export default router;
