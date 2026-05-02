import { Router, type IRouter } from "express";
import { sql, desc, and, gte } from "drizzle-orm";
import { db, loansTable, loanDocumentsTable, activityLogTable, loanTasksTable, escrowAccountsTable, helocAccountsTable } from "@workspace/db";
import { GetPipelineActivityQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/pipeline/summary", async (_req, res): Promise<void> => {
  const [totalResult, byStage, byType, creditResult] = await Promise.all([
    db.select({
      totalLoans: sql<number>`count(*)`,
      totalVolume: sql<number>`coalesce(sum(cast(loan_amount as numeric)), 0)`,
      avgAmount: sql<number>`coalesce(avg(cast(loan_amount as numeric)), 0)`,
    }).from(loansTable),

    db.select({
      stage: loansTable.stage,
      count: sql<number>`count(*)`,
      volume: sql<number>`coalesce(sum(cast(loan_amount as numeric)), 0)`,
    }).from(loansTable).groupBy(loansTable.stage),

    db.select({
      type: loansTable.loanType,
      count: sql<number>`count(*)`,
    }).from(loansTable).groupBy(loansTable.loanType),

    db.select({
      avgCredit: sql<number>`coalesce(avg(credit_score), 0)`,
    }).from(loansTable),
  ]);

  const [closingThisMonth, pendingDocs, approved, openTasks, escrowDisbursements, helocTotal] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(loansTable).where(sql`stage = 'closing'`),
    db.select({ count: sql<number>`count(*)` }).from(loanDocumentsTable).where(sql`status = 'pending'`),
    db.select({ count: sql<number>`count(*)` }).from(loansTable).where(sql`stage in ('approved', 'closing', 'funded')`),
    db.select({ count: sql<number>`count(*)` }).from(loanTasksTable).where(sql`status in ('open', 'in_progress')`),
    db.select({ count: sql<number>`count(*)` }).from(escrowAccountsTable).where(
      and(sql`next_disbursement_date is not null`, gte(escrowAccountsTable.nextDisbursementDate as unknown as string, new Date().toISOString().split("T")[0]!))
    ),
    db.select({
      count: sql<number>`count(*)`,
      totalCredit: sql<number>`coalesce(sum(cast(credit_limit as numeric)), 0)`,
    }).from(helocAccountsTable),
  ]);

  const summary = totalResult[0];
  res.json({
    totalLoans: Number(summary?.totalLoans ?? 0),
    totalVolume: Number(summary?.totalVolume ?? 0),
    averageLoanAmount: Number(summary?.avgAmount ?? 0),
    byStage: byStage.map(s => ({ stage: s.stage, count: Number(s.count), volume: Number(s.volume) })),
    byType: byType.map(t => ({ type: t.type, count: Number(t.count) })),
    closingThisMonth: Number(closingThisMonth[0]?.count ?? 0),
    pendingDocuments: Number(pendingDocs[0]?.count ?? 0),
    approvedLoans: Number(approved[0]?.count ?? 0),
    averageCreditScore: Math.round(Number(creditResult[0]?.avgCredit ?? 0)),
    openTasks: Number(openTasks[0]?.count ?? 0),
    escrowDisbursementsThisMonth: Number(escrowDisbursements[0]?.count ?? 0),
    helocAccounts: Number(helocTotal[0]?.count ?? 0),
    totalHelocCredit: Number(helocTotal[0]?.totalCredit ?? 0),
  });
});

router.get("/pipeline/activity", async (req, res): Promise<void> => {
  const parsed = GetPipelineActivityQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const limit = parsed.data.limit ?? 10;
  const activity = await db.select().from(activityLogTable)
    .orderBy(desc(activityLogTable.timestamp))
    .limit(limit);
  res.json(activity.map(a => ({ ...a, timestamp: a.timestamp.toISOString() })));
});

export default router;
