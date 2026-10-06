import type { PublicImage } from "./media";

/** Datos del sitio público. Sólo salen de notas en estado PUBLISHED. */

export type CategoryLink = { name: string; slug: string };

export type TagLink = { name: string; slug: string };

export type ArticleCardData = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: Date;
  readingTimeMinutes: number;
  category: CategoryLink;
  authorName: string;
  image: PublicImage | null;
};

export type PublicArticle = ArticleCardData & {
  content: unknown;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: Date;
  tags: TagLink[];
};

export type HomepageData = {
  lead: ArticleCardData | null;
  secondary: ArticleCardData[];
  latest: ArticleCardData[];
  sections: { category: CategoryLink; articles: ArticleCardData[] }[];
};

export type ArticlePage = {
  articles: ArticleCardData[];
  total: number;
  page: number;
  pageCount: number;
};

/** Resultado de buscar una nota por dirección: la nota, una redirección a su dirección nueva o nada. */
export type ArticleLookup =
  { kind: "article"; article: PublicArticle } | { kind: "redirect"; slug: string } | { kind: "missing" };
