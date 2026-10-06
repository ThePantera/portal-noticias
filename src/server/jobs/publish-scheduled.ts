import "server-only";
import { db } from "@/server/db";
import { recordArticleEvent } from "@/server/events/outbox";

export type PublishedByScheduler = { id: string; slug: string; title: string };

/**
 * Publica las notas programadas cuya hora llegó (ADR 0007). Es el backend el que decide:
 * el público nunca ve una nota SCHEDULED aunque su hora haya pasado.
 *
 * Un único UPDATE con `WHERE status = 'SCHEDULED'` toma cada fila una sola vez, así que dos
 * ejecuciones simultáneas no publican dos veces. La fecha de publicación es la programada,
 * no la de la ejecución, para que un cron atrasado no corra la fecha de la nota.
 */
export async function publishDueArticles(now = new Date()): Promise<PublishedByScheduler[]> {
  return db.$transaction(async (tx) => {
    const published = await tx.$queryRaw<(PublishedByScheduler & { published_at: Date })[]>`
      UPDATE articles
         SET status = 'PUBLISHED', published_at = scheduled_at, scheduled_at = NULL, updated_at = now()
       WHERE status = 'SCHEDULED' AND scheduled_at <= ${now}
   RETURNING id, slug, title, published_at`;

    for (const article of published) {
      await recordArticleEvent(
        tx,
        "ARTICLE_PUBLISHED",
        {
          articleId: article.id,
          slug: article.slug,
          title: article.title,
          status: "PUBLISHED",
          from: "SCHEDULED",
          trigger: "scheduler",
          publishedAt: article.published_at.toISOString(),
        },
        null,
      );
    }
    return published.map(({ id, slug, title }) => ({ id, slug, title }));
  });
}
