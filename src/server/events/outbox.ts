import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ArticleStatus } from "@/types/article";

/**
 * Eventos de dominio (ADR 0006). Se escriben en `domain_events` dentro de la misma
 * transacción que el cambio, así nunca hay un evento sin cambio ni un cambio sin evento.
 * Los consumidores (caché, Telegram, newsletter, redes) leen las filas sin procesar.
 */
export type ArticleEventType =
  | "ARTICLE_CREATED"
  | "ARTICLE_UPDATED"
  | "ARTICLE_SCHEDULED"
  | "ARTICLE_PUBLISHED"
  | "ARTICLE_UNPUBLISHED"
  | "ARTICLE_ARCHIVED"
  | "ARTICLE_DELETED";

export type ArticleEventPayload = {
  articleId: string;
  slug: string;
  title: string;
  status: ArticleStatus;
  /** Estado anterior, en los cambios de estado. */
  from?: ArticleStatus;
  scheduledAt?: string;
  publishedAt?: string;
  /** Quién o qué lo disparó cuando no hay un usuario: "scheduler". */
  trigger?: "editor" | "scheduler";
};

export async function recordArticleEvent(
  tx: Prisma.TransactionClient,
  type: ArticleEventType,
  payload: ArticleEventPayload,
  actorId: string | null,
): Promise<void> {
  await tx.domainEvent.create({
    data: { type, aggregateType: "article", aggregateId: payload.articleId, payload, actorId },
  });
}
