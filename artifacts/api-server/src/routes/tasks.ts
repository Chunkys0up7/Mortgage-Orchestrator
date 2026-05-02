import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, loanTasksTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/tasks", async (req, res): Promise<void> => {
  const { status, assignedTo, loanId } = req.query;
  const conditions = [];
  if (status) conditions.push(eq(loanTasksTable.status, String(status)));
  if (assignedTo) conditions.push(eq(loanTasksTable.assignedTo, String(assignedTo)));
  if (loanId) conditions.push(eq(loanTasksTable.loanId, parseInt(String(loanId))));

  const tasks = await db.select().from(loanTasksTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      sql`CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END`,
      desc(loanTasksTable.createdAt)
    );
  res.json(tasks);
});

router.post("/tasks", async (req, res): Promise<void> => {
  const { loanId, loanNumber, borrowerName, taskType, description, dueDate, assignedTo, priority } = req.body;
  const [task] = await db.insert(loanTasksTable).values({
    loanId, loanNumber, borrowerName, taskType, description,
    dueDate: dueDate ?? null,
    assignedTo: assignedTo ?? null,
    priority: priority ?? "normal",
    status: "open",
  }).returning();
  res.status(201).json(task);
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const allowed = ["status", "priority", "assignedTo", "dueDate", "description"];
  const updates: Record<string, string | null> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const [task] = await db.update(loanTasksTable)
    .set(updates)
    .where(eq(loanTasksTable.id, id)).returning();
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  res.json(task);
});

export default router;
