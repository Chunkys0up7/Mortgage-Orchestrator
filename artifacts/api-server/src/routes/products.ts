import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, loanProductsTable } from "@workspace/db";
import { GetProductParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", async (_req, res): Promise<void> => {
  const products = await db.select().from(loanProductsTable)
    .where(eq(loanProductsTable.isActive, true))
    .orderBy(loanProductsTable.name);
  res.json(products.map(p => ({
    ...p,
    minLoanAmount: Number(p.minLoanAmount),
    maxLoanAmount: Number(p.maxLoanAmount),
    maxLtv: Number(p.maxLtv),
    maxDti: Number(p.maxDti),
  })));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [product] = await db.select().from(loanProductsTable).where(eq(loanProductsTable.id, params.data.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json({
    ...product,
    minLoanAmount: Number(product.minLoanAmount),
    maxLoanAmount: Number(product.maxLoanAmount),
    maxLtv: Number(product.maxLtv),
    maxDti: Number(product.maxDti),
  });
});

export default router;
