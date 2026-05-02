import { Router, type IRouter } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db, borrowersTable } from "@workspace/db";
import {
  ListBorrowersQueryParams,
  CreateBorrowerBody,
  GetBorrowerParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/borrowers", async (req, res): Promise<void> => {
  const parsed = ListBorrowersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search } = parsed.data;
  const borrowers = await db.select().from(borrowersTable)
    .where(
      search
        ? or(
            ilike(borrowersTable.firstName, `%${search}%`),
            ilike(borrowersTable.lastName, `%${search}%`),
            ilike(borrowersTable.email, `%${search}%`)
          )
        : undefined
    )
    .orderBy(borrowersTable.lastName);

  res.json(borrowers.map(b => ({
    ...b,
    annualIncome: b.annualIncome ? Number(b.annualIncome) : null,
  })));
});

router.post("/borrowers", async (req, res): Promise<void> => {
  const parsed = CreateBorrowerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [borrower] = await db.insert(borrowersTable).values({
    ...parsed.data,
    annualIncome: parsed.data.annualIncome ? String(parsed.data.annualIncome) : null,
  }).returning();
  res.status(201).json({
    ...borrower,
    annualIncome: borrower.annualIncome ? Number(borrower.annualIncome) : null,
  });
});

router.get("/borrowers/:id", async (req, res): Promise<void> => {
  const params = GetBorrowerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [borrower] = await db.select().from(borrowersTable).where(eq(borrowersTable.id, params.data.id));
  if (!borrower) {
    res.status(404).json({ error: "Borrower not found" });
    return;
  }
  res.json({
    ...borrower,
    annualIncome: borrower.annualIncome ? Number(borrower.annualIncome) : null,
  });
});

export default router;
