import { Router, type IRouter } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db, knowledgeArticlesTable } from "@workspace/db";
import {
  ListKnowledgeArticlesQueryParams,
  GetKnowledgeArticleParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/knowledge/articles", async (req, res): Promise<void> => {
  const parsed = ListKnowledgeArticlesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { category, search } = parsed.data;
  const articles = await db.select().from(knowledgeArticlesTable)
    .where(
      category
        ? eq(knowledgeArticlesTable.category, category)
        : search
        ? or(
            ilike(knowledgeArticlesTable.title, `%${search}%`),
            ilike(knowledgeArticlesTable.summary, `%${search}%`),
            ilike(knowledgeArticlesTable.content, `%${search}%`)
          )
        : undefined
    )
    .orderBy(knowledgeArticlesTable.category, knowledgeArticlesTable.title);
  res.json(articles);
});

router.get("/knowledge/articles/:id", async (req, res): Promise<void> => {
  const params = GetKnowledgeArticleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [article] = await db.select().from(knowledgeArticlesTable).where(eq(knowledgeArticlesTable.id, params.data.id));
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.json(article);
});

export default router;
