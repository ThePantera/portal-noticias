import "server-only";
import type { $Enums } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type { AdminArticleRow } from "@/types/admin";
import type { ArticleOrigin, ArticleStatus, Role } from "@/types/article";

// Los tipos de dominio (src/types/article.ts) tienen que coincidir con los enums del esquema.
// Si alguien agrega un valor en Prisma y se olvida acá (o al revés), esto no compila.
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _statusesMatch: Exact<ArticleStatus, $Enums.ArticleStatus> = true;
const _originsMatch: Exact<ArticleOrigin, $Enums.ArticleOrigin> = true;
const _rolesMatch: Exact<Role, $Enums.Role> = true;
void _statusesMatch;
void _originsMatch;
void _rolesMatch;

export type StatusCounts = Record<ArticleStatus, number> & { total: number };

/** Cuántas notas hay en cada estado. Una sola consulta agrupada. */
export async function countArticlesByStatus(): Promise<StatusCounts> {
  const rows = await db.article.groupBy({ by: ["status"], _count: { _all: true } });
  const counts: StatusCounts = { DRAFT: 0, SCHEDULED: 0, PUBLISHED: 0, ARCHIVED: 0, total: 0 };
  for (const row of rows) {
    counts[row.status] = row._count._all;
    counts.total += row._count._all;
  }
  return counts;
}

/** Notas programadas cuya hora ya pasó y siguen sin publicarse: avisa si el cron dejó de correr. */
export function countOverdueScheduled(now = new Date()): Promise<number> {
  return db.article.count({ where: { status: "SCHEDULED", scheduledAt: { lte: now } } });
}

/** Últimas notas tocadas, para el tablero. Trae sólo las columnas que se muestran. */
export async function listRecentArticles(limit = 8): Promise<AdminArticleRow[]> {
  const articles = await db.article.findMany({
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      scheduledAt: true,
      updatedAt: true,
      category: { select: { name: true } },
      author: { select: { name: true } },
    },
  });
  return articles.map(({ category, author, ...rest }) => ({
    ...rest,
    categoryName: category.name,
    authorName: author.name,
  }));
}
