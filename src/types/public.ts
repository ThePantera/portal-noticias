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

/** Una nota de "Lo más leído": lo justo para el titular numerado. */
export type MostReadArticle = { id: string; slug: string; title: string; category: CategoryLink };

export type PublicArticle = ArticleCardData & {
  content: unknown;
  seoTitle: string | null;
  seoDescription: string | null;
  videoUrl: string | null;
  /** Redactada con inteligencia artificial (asistente o publicador automático): lleva un aviso. */
  aiAssisted: boolean;
  updatedAt: Date;
  tags: TagLink[];
  /** Cobertura en vivo activa: la nota se refresca sola. */
  isLive: boolean;
  /** Actualizaciones de la cobertura, la más nueva primero (puede tenerlas aunque ya terminó). */
  liveUpdates: LiveUpdate[];
  /** Fotos de la galería, en orden. */
  gallery: PublicImage[];
};

export type LiveUpdate = { id: string; body: string; createdAt: Date };

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
