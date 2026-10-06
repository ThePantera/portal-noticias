import type { EditorDoc } from "@/lib/content";
import type { ArticleOrigin, ArticleStatus } from "./article";

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

/** Nota completa tal como la abre el editor. */
export type EditableArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: EditorDoc;
  status: ArticleStatus;
  origin: ArticleOrigin;
  featuredRank: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  authorId: string;
  authorName: string;
  tags: string[];
  publishedAt: Date | null;
  scheduledAt: Date | null;
  updatedAt: Date;
  readingTimeMinutes: number;
};

export type CategoryOption = { id: string; name: string; isActive: boolean };

export type EditorIntent = "save" | "publish" | "schedule" | "unpublish" | "archive";

/** Respuesta del guardado al editor. */
export type EditorFormState = {
  status: "idle" | "saved" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Cambia en cada guardado exitoso, para que el editor sepa que ya no hay cambios pendientes. */
  savedAt?: number;
};
