import type { ArticleStatus } from "./article";

/** Fila de nota que muestra el panel. Compartida entre servicios y componentes. */
export type AdminArticleRow = {
  id: string;
  title: string;
  slug: string;
  status: ArticleStatus;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  updatedAt: Date;
  categoryName: string;
  authorName: string;
};
