import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { ARTICLES_TAG, CATEGORIES_TAG, articleTag } from "@/lib/cache-tags";
import * as queries from "@/server/services/public-queries";

/**
 * Lecturas del sitio público con caché. Cada cambio de una nota (guardar, publicar,
 * programar, despublicar, archivar o el publicador automático) invalida ARTICLES_TAG,
 * así que lo que se ve nunca queda atrás de la base. `hours` es sólo la red de seguridad.
 */

export async function getNavCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag(CATEGORIES_TAG);
  return queries.listNavCategories();
}

export async function getHomepage() {
  "use cache";
  cacheLife("hours");
  cacheTag(ARTICLES_TAG, CATEGORIES_TAG);
  return queries.getHomepage();
}

export async function getArticleBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(ARTICLES_TAG);
  const result = await queries.findPublishedArticle(slug);
  if (result.kind === "article") cacheTag(articleTag(result.article.id));
  return result;
}

export async function getRelatedArticles(articleId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(ARTICLES_TAG);
  return queries.listRelatedArticles(articleId);
}

export async function getCategoryPage(slug: string, page: number) {
  "use cache";
  cacheLife("hours");
  cacheTag(ARTICLES_TAG, CATEGORIES_TAG);
  return queries.getCategoryPage(slug, page);
}

export async function getTagPage(slug: string, page: number) {
  "use cache";
  cacheLife("hours");
  cacheTag(ARTICLES_TAG);
  return queries.getTagPage(slug, page);
}

export async function getRecentSlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag(ARTICLES_TAG);
  return queries.listRecentSlugs();
}

export async function getSitemapEntries() {
  "use cache";
  cacheLife("hours");
  cacheTag(ARTICLES_TAG, CATEGORIES_TAG);
  return queries.listSitemapEntries();
}

/** La ventana de 48 horas se calcula adentro de la caché, que se renueva cada hora o al publicar. */
export async function getNewsSitemapArticles() {
  "use cache";
  cacheLife("hours");
  cacheTag(ARTICLES_TAG);
  return queries.listNewsSitemapArticles(new Date());
}

export async function getFeedArticles() {
  "use cache";
  cacheLife("hours");
  cacheTag(ARTICLES_TAG);
  return queries.listFeedArticles();
}

/** La búsqueda depende de lo que escribe cada lector: no se guarda en caché. */
export const searchArticles = queries.searchArticles;
