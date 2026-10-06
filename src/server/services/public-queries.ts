import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type {
  ArticleCardData,
  ArticleLookup,
  ArticlePage,
  CategoryLink,
  HomepageData,
  TagLink,
} from "@/types/public";

/**
 * Consultas del sitio público. Todas filtran por PUBLISHED: un borrador, una nota
 * programada o una archivada no sale nunca por acá, aunque alguien adivine su dirección.
 * Las versiones con caché están en `public-content.ts`.
 */

export const PUBLIC_PAGE_SIZE = 12;
export const SEARCH_MAX_LENGTH = 200;

const PUBLISHED = { status: "PUBLISHED" } as const satisfies Prisma.ArticleWhereInput;

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  publishedAt: true,
  updatedAt: true,
  readingTimeMinutes: true,
  category: { select: { name: true, slug: true } },
  author: { select: { name: true } },
} as const satisfies Prisma.ArticleSelect;

type CardRow = Prisma.ArticleGetPayload<{ select: typeof cardSelect }>;

function toCard({ author, publishedAt, updatedAt, ...rest }: CardRow): ArticleCardData {
  // Una nota publicada siempre tiene fecha; si faltara, la última edición es lo más honesto.
  return { ...rest, publishedAt: publishedAt ?? updatedAt, authorName: author.name };
}

const newestFirst = [
  { publishedAt: "desc" },
  { id: "desc" },
] as const satisfies Prisma.ArticleOrderByWithRelationInput[];

/** Secciones activas en el orden de la navegación. */
export function listNavCategories(): Promise<CategoryLink[]> {
  return db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { name: true, slug: true },
  });
}

/**
 * Portada: la nota principal y hasta tres secundarias salen del orden de destacadas
 * (1 = principal); si faltan, se completan con las más recientes. Debajo, las últimas
 * y un bloque por sección, sin repetir lo que ya está arriba.
 */
export async function getHomepage(): Promise<HomepageData> {
  const [featured, recent, categories] = await Promise.all([
    db.article.findMany({
      where: { ...PUBLISHED, featuredRank: { not: null } },
      orderBy: [{ featuredRank: "asc" }, ...newestFirst],
      take: 4,
      select: cardSelect,
    }),
    db.article.findMany({ where: PUBLISHED, orderBy: newestFirst, take: 16, select: cardSelect }),
    listNavCategories(),
  ]);

  const top: ArticleCardData[] = [];
  for (const row of [...featured, ...recent]) {
    if (top.length === 4) break;
    if (!top.some((a) => a.id === row.id)) top.push(toCard(row));
  }
  const shown = new Set(top.map((a) => a.id));
  const latest = recent
    .filter((row) => !shown.has(row.id))
    .slice(0, 8)
    .map(toCard);
  for (const a of latest) shown.add(a.id);

  const sectionRows = await Promise.all(
    categories.map((category) =>
      db.article.findMany({
        where: { ...PUBLISHED, category: { slug: category.slug }, id: { notIn: [...shown] } },
        orderBy: newestFirst,
        take: 3,
        select: cardSelect,
      }),
    ),
  );
  const sections = categories
    .map((category, i) => ({ category, articles: sectionRows[i].map(toCard) }))
    .filter((section) => section.articles.length > 0);

  return { lead: top[0] ?? null, secondary: top.slice(1), latest, sections };
}

/**
 * Una nota publicada por su dirección. Si la dirección es vieja (la nota cambió de
 * título y de slug), devuelve la nueva para redirigir con 308 y no perder los enlaces.
 */
export async function findPublishedArticle(slug: string): Promise<ArticleLookup> {
  const article = await db.article.findFirst({
    where: { ...PUBLISHED, slug },
    select: {
      ...cardSelect,
      content: true,
      seoTitle: true,
      seoDescription: true,
      tags: { select: { tag: { select: { name: true, slug: true } } }, orderBy: { tag: { name: "asc" } } },
    },
  });
  if (article) {
    const { content, seoTitle, seoDescription, tags, ...card } = article;
    return {
      kind: "article",
      article: {
        ...toCard(card),
        content,
        seoTitle,
        seoDescription,
        updatedAt: card.updatedAt,
        tags: tags.map((t) => t.tag),
      },
    };
  }

  const previous = await db.articleSlugHistory.findUnique({
    where: { slug },
    select: { article: { select: { slug: true, status: true } } },
  });
  if (previous?.article.status === "PUBLISHED") return { kind: "redirect", slug: previous.article.slug };
  return { kind: "missing" };
}

/** Hasta tres notas para seguir leyendo: primero las que comparten etiquetas, después las de la sección. */
export async function listRelatedArticles(articleId: string, limit = 3): Promise<ArticleCardData[]> {
  const source = await db.article.findUnique({
    where: { id: articleId },
    select: { categoryId: true, tags: { select: { tagId: true } } },
  });
  if (!source) return [];
  const tagIds = source.tags.map((t) => t.tagId);
  const others = { ...PUBLISHED, id: { not: articleId } };

  const byTag = tagIds.length
    ? await db.article.findMany({
        where: { ...others, tags: { some: { tagId: { in: tagIds } } } },
        orderBy: newestFirst,
        take: limit,
        select: cardSelect,
      })
    : [];
  if (byTag.length >= limit) return byTag.map(toCard);

  const byCategory = await db.article.findMany({
    where: {
      ...others,
      categoryId: source.categoryId,
      id: { notIn: [articleId, ...byTag.map((a) => a.id)] },
    },
    orderBy: newestFirst,
    take: limit - byTag.length,
    select: cardSelect,
  });
  return [...byTag, ...byCategory].map(toCard);
}

async function pageOf(where: Prisma.ArticleWhereInput, page: number): Promise<ArticlePage> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const [total, rows] = await Promise.all([
    db.article.count({ where }),
    db.article.findMany({
      where,
      orderBy: newestFirst,
      skip: (safePage - 1) * PUBLIC_PAGE_SIZE,
      take: PUBLIC_PAGE_SIZE,
      select: cardSelect,
    }),
  ]);
  return {
    articles: rows.map(toCard),
    total,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE)),
  };
}

/** Sección activa con sus notas, o null si no existe o está desactivada. */
export async function getCategoryPage(slug: string, page = 1) {
  const category = await db.category.findFirst({
    where: { slug, isActive: true },
    select: { name: true, slug: true, description: true, seoTitle: true, seoDescription: true },
  });
  if (!category) return null;
  return { category, ...(await pageOf({ ...PUBLISHED, category: { slug } }, page)) };
}

/** Etiqueta con sus notas publicadas, o null si no existe o no tiene ninguna. */
export async function getTagPage(slug: string, page = 1): Promise<({ tag: TagLink } & ArticlePage) | null> {
  const tag = await db.tag.findUnique({ where: { slug }, select: { name: true, slug: true } });
  if (!tag) return null;
  const result = await pageOf({ ...PUBLISHED, tags: { some: { tag: { slug } } } }, page);
  return result.total === 0 ? null : { tag, ...result };
}

/**
 * Búsqueda de texto completo sobre título (peso A), bajada (B) y cuerpo (C), sin
 * distinguir tildes. `websearch_to_tsquery` acepta lo que escribe una persona
 * ("dólar -blue", "\"tarifa social\"") y nunca falla por sintaxis; el texto viaja
 * como parámetro, no se concatena al SQL.
 */
export async function searchArticles(query: string, page = 1): Promise<ArticlePage & { query: string }> {
  const q = query.trim().slice(0, SEARCH_MAX_LENGTH);
  const safePage = Math.max(1, Math.floor(page) || 1);
  if (!q) return { query: q, articles: [], total: 0, page: 1, pageCount: 1 };

  const offset = (safePage - 1) * PUBLIC_PAGE_SIZE;
  const [hits, [{ count }]] = await Promise.all([
    db.$queryRaw<{ id: string }[]>`
      SELECT id FROM articles, websearch_to_tsquery('spanish', f_unaccent(${q})) AS query
       WHERE status = 'PUBLISHED' AND search_vector @@ query
       ORDER BY ts_rank(search_vector, query) DESC, published_at DESC, id DESC
       LIMIT ${PUBLIC_PAGE_SIZE} OFFSET ${offset}`,
    db.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) AS count FROM articles, websearch_to_tsquery('spanish', f_unaccent(${q})) AS query
       WHERE status = 'PUBLISHED' AND search_vector @@ query`,
  ]);

  const rows = hits.length
    ? await db.article.findMany({ where: { id: { in: hits.map((h) => h.id) } }, select: cardSelect })
    : [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const total = Number(count);
  return {
    query: q,
    articles: hits.flatMap((h) => {
      const row = byId.get(h.id);
      return row ? [toCard(row)] : [];
    }),
    total,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE)),
  };
}

/** Direcciones de las notas más recientes, para prerenderizarlas en el build. */
export async function listRecentSlugs(limit = 20): Promise<string[]> {
  const rows = await db.article.findMany({
    where: PUBLISHED,
    orderBy: newestFirst,
    take: limit,
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

export const NEWS_SITEMAP_HOURS = 48;
export const FEED_SIZE = 20;

/** Todo lo indexable: notas publicadas, secciones activas y etiquetas con alguna nota publicada. */
export async function listSitemapEntries() {
  const [articles, categories, tags] = await Promise.all([
    db.article.findMany({
      where: PUBLISHED,
      orderBy: newestFirst,
      take: 50_000,
      select: { slug: true, updatedAt: true },
    }),
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, updatedAt: true },
    }),
    db.tag.findMany({
      where: { articles: { some: { article: PUBLISHED } } },
      orderBy: { slug: "asc" },
      select: { slug: true },
    }),
  ]);
  return { articles, categories, tags };
}

/** Notas publicadas en las últimas 48 horas, para el sitemap de Google News. */
export function listNewsSitemapArticles(now: Date) {
  return db.article.findMany({
    where: { ...PUBLISHED, publishedAt: { gte: new Date(now.getTime() - NEWS_SITEMAP_HOURS * 3_600_000) } },
    orderBy: newestFirst,
    take: 1000,
    select: { slug: true, title: true, publishedAt: true },
  });
}

/** Las últimas notas para el feed RSS. */
export async function listFeedArticles(): Promise<ArticleCardData[]> {
  const rows = await db.article.findMany({
    where: PUBLISHED,
    orderBy: newestFirst,
    take: FEED_SIZE,
    select: cardSelect,
  });
  return rows.map(toCard);
}
