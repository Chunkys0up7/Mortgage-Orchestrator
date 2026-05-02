import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, loansTable, loanNotesTable, loanDocumentsTable, activityLogTable } from "@workspace/db";
import {
  ListLoansQueryParams,
  CreateLoanBody,
  GetLoanParams,
  UpdateLoanParams,
  UpdateLoanBody,
  UpdateLoanStatusParams,
  UpdateLoanStatusBody,
  GetLoanNotesParams,
  CreateLoanNoteParams,
  CreateLoanNoteBody,
  GetLoanDocumentsParams,
  AddLoanDocumentParams,
  AddLoanDocumentBody,
  UpdateLoanDocumentParams,
  UpdateLoanDocumentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateLoanNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000000) + 1000000;
  return `PB-${year}-${rand}`;
}

router.get("/loans", async (req, res): Promise<void> => {
  const parsed = ListLoansQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { status, loanOfficerId: _lo, page, limit } = parsed.data;
  const offset = ((page ?? 1) - 1) * (limit ?? 20);

  const query = db.select().from(loansTable);
  if (status) {
    void query.where(eq(loansTable.status, status));
  }

  const [loans, countResult] = await Promise.all([
    db.select().from(loansTable)
      .where(status ? eq(loansTable.status, status) : undefined)
      .orderBy(desc(loansTable.createdAt))
      .limit(limit ?? 20)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(loansTable)
      .where(status ? eq(loansTable.status, status) : undefined),
  ]);

  res.json({
    loans: loans.map(l => ({
      ...l,
      loanAmount: Number(l.loanAmount),
      interestRate: l.interestRate ? Number(l.interestRate) : null,
      ltv: l.ltv ? Number(l.ltv) : null,
      dti: l.dti ? Number(l.dti) : null,
      purchasePrice: l.purchasePrice ? Number(l.purchasePrice) : null,
      downPayment: l.downPayment ? Number(l.downPayment) : null,
    })),
    total: Number(countResult[0]?.count ?? 0),
    page: page ?? 1,
    limit: limit ?? 20,
  });
});

router.post("/loans", async (req, res): Promise<void> => {
  const parsed = CreateLoanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const loanNumber = generateLoanNumber();
  const [loan] = await db.insert(loansTable).values({
    ...parsed.data,
    loanNumber,
    borrowerName: `Borrower #${parsed.data.borrowerId}`,
    loanAmount: String(parsed.data.loanAmount),
    purchasePrice: parsed.data.purchasePrice ? String(parsed.data.purchasePrice) : null,
    downPayment: parsed.data.downPayment ? String(parsed.data.downPayment) : null,
    stage: "application",
    status: "active",
  }).returning();

  await db.insert(activityLogTable).values({
    loanId: loan.id,
    loanNumber: loan.loanNumber,
    borrowerName: loan.borrowerName,
    action: "loan_created",
    description: `New loan application created for ${loan.propertyAddress}`,
    actor: loan.loanOfficer,
    timestamp: new Date(),
  });

  res.status(201).json({
    ...loan,
    loanAmount: Number(loan.loanAmount),
    interestRate: loan.interestRate ? Number(loan.interestRate) : null,
    ltv: loan.ltv ? Number(loan.ltv) : null,
    dti: loan.dti ? Number(loan.dti) : null,
    purchasePrice: loan.purchasePrice ? Number(loan.purchasePrice) : null,
    downPayment: loan.downPayment ? Number(loan.downPayment) : null,
  });
});

router.get("/loans/:id", async (req, res): Promise<void> => {
  const params = GetLoanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, params.data.id));
  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  res.json({
    ...loan,
    loanAmount: Number(loan.loanAmount),
    interestRate: loan.interestRate ? Number(loan.interestRate) : null,
    ltv: loan.ltv ? Number(loan.ltv) : null,
    dti: loan.dti ? Number(loan.dti) : null,
    purchasePrice: loan.purchasePrice ? Number(loan.purchasePrice) : null,
    downPayment: loan.downPayment ? Number(loan.downPayment) : null,
  });
});

router.patch("/loans/:id", async (req, res): Promise<void> => {
  const params = UpdateLoanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateLoanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.loanAmount != null) updateData.loanAmount = String(parsed.data.loanAmount);
  if (parsed.data.interestRate != null) updateData.interestRate = String(parsed.data.interestRate);
  if (parsed.data.ltv != null) updateData.ltv = String(parsed.data.ltv);
  if (parsed.data.dti != null) updateData.dti = String(parsed.data.dti);

  const [loan] = await db.update(loansTable).set(updateData as Parameters<typeof loansTable.$inferInsert extends infer T ? T : never>[0]).where(eq(loansTable.id, params.data.id)).returning();
  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  res.json({
    ...loan,
    loanAmount: Number(loan.loanAmount),
    interestRate: loan.interestRate ? Number(loan.interestRate) : null,
    ltv: loan.ltv ? Number(loan.ltv) : null,
    dti: loan.dti ? Number(loan.dti) : null,
    purchasePrice: loan.purchasePrice ? Number(loan.purchasePrice) : null,
    downPayment: loan.downPayment ? Number(loan.downPayment) : null,
  });
});

router.patch("/loans/:id/status", async (req, res): Promise<void> => {
  const params = UpdateLoanStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateLoanStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [loan] = await db.update(loansTable)
    .set({ status: parsed.data.status, stage: parsed.data.stage })
    .where(eq(loansTable.id, params.data.id))
    .returning();

  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }

  await db.insert(activityLogTable).values({
    loanId: loan.id,
    loanNumber: loan.loanNumber,
    borrowerName: loan.borrowerName,
    action: "status_changed",
    description: `Loan moved to ${parsed.data.stage} stage`,
    actor: loan.loanOfficer,
    timestamp: new Date(),
  });

  res.json({
    ...loan,
    loanAmount: Number(loan.loanAmount),
    interestRate: loan.interestRate ? Number(loan.interestRate) : null,
    ltv: loan.ltv ? Number(loan.ltv) : null,
    dti: loan.dti ? Number(loan.dti) : null,
    purchasePrice: loan.purchasePrice ? Number(loan.purchasePrice) : null,
    downPayment: loan.downPayment ? Number(loan.downPayment) : null,
  });
});

router.get("/loans/:id/notes", async (req, res): Promise<void> => {
  const params = GetLoanNotesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const notes = await db.select().from(loanNotesTable)
    .where(eq(loanNotesTable.loanId, params.data.id))
    .orderBy(desc(loanNotesTable.createdAt));
  res.json(notes);
});

router.post("/loans/:id/notes", async (req, res): Promise<void> => {
  const params = CreateLoanNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateLoanNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [note] = await db.insert(loanNotesTable).values({
    loanId: params.data.id,
    ...parsed.data,
  }).returning();
  res.status(201).json(note);
});

router.get("/loans/:id/documents", async (req, res): Promise<void> => {
  const params = GetLoanDocumentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const docs = await db.select().from(loanDocumentsTable)
    .where(eq(loanDocumentsTable.loanId, params.data.id))
    .orderBy(loanDocumentsTable.documentName);
  res.json(docs);
});

router.post("/loans/:id/documents", async (req, res): Promise<void> => {
  const params = AddLoanDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddLoanDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [doc] = await db.insert(loanDocumentsTable).values({
    loanId: params.data.id,
    ...parsed.data,
    status: "pending",
  }).returning();
  res.status(201).json(doc);
});

router.patch("/loans/:loanId/documents/:docId", async (req, res): Promise<void> => {
  const params = UpdateLoanDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateLoanDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.status != null) updateData.status = parsed.data.status;
  if (parsed.data.notes != null) updateData.notes = parsed.data.notes;
  if (parsed.data.receivedAt != null) updateData.receivedAt = parsed.data.receivedAt;

  const [doc] = await db.update(loanDocumentsTable)
    .set(updateData as Parameters<typeof loanDocumentsTable.$inferInsert extends infer T ? T : never>[0])
    .where(eq(loanDocumentsTable.id, params.data.docId))
    .returning();
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(doc);
});

export default router;
