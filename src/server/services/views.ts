import "server-only";
import { db } from "@/server/db";
import type { MostReadArticle } from "@/types/public";

/**
 * Lecturas por nota y por día (tabla article_views_daily). Sólo cuentan las notas
 * publicadas: un id inventado o un borrador no escriben nada.
 */
export async function recordView(articleId: string, day: string): Promise<void> {
  await db.$executeRaw`
    INSERT INTO "article_views_daily" ("article_id", "day", "views")
    SELECT ${articleId}, ${day}::date, 1
    WHERE EXISTS (SELECT 1 FROM "articles" WHERE "id" = ${articleId} AND "status" = 'PUBLISHED')
    ON CONFLICT ("article_id", "day") DO UPDATE SET "views" = "article_views_daily"."views" + 1`;
}

export type MostReadRow = MostReadArticle & { views: number };

/**
 * Las notas más leídas desde `since` (día "AAAA-MM-DD"), sólo publicadas. Devuelve sólo datos
 * públicos (título, dirección y sección), así sirve también para el sitio.
 */
export async function listMostRead(since: string, limit = 10): Promise<MostReadRow[]> {
  const groups = await db.articleViewDaily.groupBy({
    by: ["articleId"],
    where: { day: { gte: new Date(`${since}T00:00:00Z`) }, article: { status: "PUBLISHED" } },
    _sum: { views: true },
    orderBy: { _sum: { views: "desc" } },
    take: limit,
  });
  if (groups.length === 0) return [];
  const articles = await db.article.findMany({
    where: { id: { in: groups.map((g) => g.articleId) }, status: "PUBLISHED" },
    select: { id: true, slug: true, title: true, category: { select: { name: true, slug: true } } },
  });
  const byId = new Map(articles.map((a) => [a.id, a]));
  return groups.flatMap((g) => {
    const article = byId.get(g.articleId);
    return article ? [{ ...article, views: g._sum.views ?? 0 }] : [];
  });
}

/** Total de lecturas por día desde `since`, del más reciente al más viejo. */
export async function listDailyViews(since: string): Promise<{ day: string; views: number }[]> {
  const groups = await db.articleViewDaily.groupBy({
    by: ["day"],
    where: { day: { gte: new Date(`${since}T00:00:00Z`) } },
    _sum: { views: true },
    orderBy: { day: "desc" },
  });
  return groups.map((g) => ({ day: g.day.toISOString().slice(0, 10), views: g._sum.views ?? 0 }));
}
