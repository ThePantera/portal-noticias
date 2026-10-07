import "server-only";
import { createHash } from "node:crypto";
import {
  IP_WINDOW_MS,
  MAX_EMOJIS_PER_ARTICLE,
  MAX_REACTIONS_PER_IP,
  MAX_REACTIONS_PER_VISITOR,
  MAX_SAME_REACTION_PER_IP,
  sortReactions,
  type ReactionSummary,
} from "@/lib/reactions";
import { db } from "@/server/db";

/**
 * Reacciones anónimas de los lectores (ADR 0010). Se identifican por el hash de su cookie;
 * la IP (también en hash) sólo sirve para poner topes. Sólo las notas publicadas aceptan
 * reacciones y las muestran.
 */

export type Reactor = { visitorHash: string; ipHash: string | null };

export type ToggleResult =
  | { ok: true; summary: ReactionSummary }
  | { ok: false; reason: "missing" | "visitor-limit" | "article-limit" | "ip-limit" };

/** Hash para guardar identificadores sin poder volver al original. */
export function hashIdentifier(value: string): string {
  return createHash("sha256").update(`portal-reacciones:${value}`).digest("hex");
}

async function isPublished(articleId: string): Promise<boolean> {
  const article = await db.article.findFirst({
    where: { id: articleId, status: "PUBLISHED" },
    select: { id: true },
  });
  return article !== null;
}

async function summarize(articleId: string, visitorHash: string | null): Promise<ReactionSummary> {
  const [groups, mine] = await Promise.all([
    db.articleReaction.groupBy({
      by: ["emoji"],
      where: { articleId },
      _count: { _all: true },
      _min: { createdAt: true },
    }),
    visitorHash
      ? db.articleReaction.findMany({
          where: { articleId, visitorHash },
          select: { emoji: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);
  return {
    reactions: sortReactions(
      groups.map((g) => ({ emoji: g.emoji, count: g._count._all, firstAt: g._min.createdAt })),
    ),
    mine: mine.map((r) => r.emoji),
  };
}

/** Conteo por emoji de una nota publicada y cuáles dejó este navegador. null si no está publicada. */
export async function getReactionSummary(
  articleId: string,
  visitorHash: string | null,
): Promise<ReactionSummary | null> {
  if (!(await isPublished(articleId))) return null;
  return summarize(articleId, visitorHash);
}

async function exceedsLimits(
  articleId: string,
  emoji: string,
  reactor: Reactor,
): Promise<Exclude<ToggleResult, { ok: true }>["reason"] | null> {
  const visitorCount = await db.articleReaction.count({
    where: { articleId, visitorHash: reactor.visitorHash },
  });
  if (visitorCount >= MAX_REACTIONS_PER_VISITOR) return "visitor-limit";

  const emojiExists = await db.articleReaction.findFirst({
    where: { articleId, emoji },
    select: { id: true },
  });
  if (!emojiExists) {
    const distinct = await db.articleReaction.groupBy({ by: ["emoji"], where: { articleId } });
    if (distinct.length >= MAX_EMOJIS_PER_ARTICLE) return "article-limit";
  }

  if (reactor.ipHash) {
    const since = new Date(Date.now() - IP_WINDOW_MS);
    const [recent, same] = await Promise.all([
      db.articleReaction.count({ where: { ipHash: reactor.ipHash, createdAt: { gte: since } } }),
      db.articleReaction.count({ where: { ipHash: reactor.ipHash, articleId, emoji } }),
    ]);
    if (recent >= MAX_REACTIONS_PER_IP || same >= MAX_SAME_REACTION_PER_IP) return "ip-limit";
  }
  return null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/**
 * Pone o saca la reacción `emoji` (ya normalizado) de este navegador en la nota. Sacar
 * nunca tiene tope; poner sí (por navegador, por nota y por IP).
 */
export async function toggleReaction(
  articleId: string,
  emoji: string,
  reactor: Reactor,
): Promise<ToggleResult> {
  if (!(await isPublished(articleId))) return { ok: false, reason: "missing" };

  const removed = await db.articleReaction.deleteMany({
    where: { articleId, emoji, visitorHash: reactor.visitorHash },
  });
  if (removed.count === 0) {
    const limit = await exceedsLimits(articleId, emoji, reactor);
    if (limit) return { ok: false, reason: limit };
    try {
      await db.articleReaction.create({
        data: { articleId, emoji, visitorHash: reactor.visitorHash, ipHash: reactor.ipHash },
      });
    } catch (error) {
      // Doble toque simultáneo: la otra petición ya la creó, el resultado es el mismo.
      if (!isUniqueViolation(error)) throw error;
    }
  }
  return { ok: true, summary: await summarize(articleId, reactor.visitorHash) };
}
