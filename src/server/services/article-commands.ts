import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { allowedFrom, canTransition, type ArticleTransition } from "@/lib/article-transitions";
import { extractPlainText, readingTimeMinutes, sanitizeDoc } from "@/lib/content";
import { slugify, uniqueSlug } from "@/lib/slug";
import { db } from "@/server/db";
import { recordArticleEvent, type ArticleEventType } from "@/server/events/outbox";
import { can, type Actor } from "@/server/permissions";
import type { ArticleStatus } from "@/types/article";

/**
 * Altas, ediciones y cambios de estado de notas. Cada función valida permisos por su
 * cuenta (no confía en que la interfaz haya escondido un botón) y escribe su evento en
 * la misma transacción.
 */

export class ArticleError extends Error {
  constructor(
    readonly code: "not-found" | "forbidden" | "invalid" | "conflict",
    message: string,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

export const MAX_TAGS = 10;
export const MAX_FEATURED_RANK = 3;
const MAX_CONTENT_BYTES = 300_000;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .optional()
    .transform((v) => v || null);

export const articleInputSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(200, "Máximo 200 caracteres."),
  excerpt: z.string().trim().max(400, "Máximo 400 caracteres.").default(""),
  content: z.unknown(),
  categoryId: z.string().min(1, "Elegí una categoría."),
  tags: z
    .array(z.string())
    .default([])
    .transform((tags) => normalizeTags(tags))
    .refine((tags) => tags.length <= MAX_TAGS, `Máximo ${MAX_TAGS} etiquetas.`),
  /** Vacío: se genera desde el título. */
  slug: z.string().trim().max(120).default(""),
  seoTitle: optionalText(70),
  seoDescription: optionalText(160),
  featuredRank: z.number().int().min(1).max(MAX_FEATURED_RANK).nullable().default(null),
  /** Imagen principal ya subida (tabla media) y sus textos. Vacío: sin imagen. */
  mainImageId: z
    .string()
    .trim()
    .max(40)
    .default("")
    .transform((v) => v || null),
  mainImageAlt: z.string().trim().max(200, "Máximo 200 caracteres.").default(""),
  mainImageCaption: optionalText(300),
  mainImageCredit: optionalText(120),
});

export type ArticleInput = z.input<typeof articleInputSchema>;

/** Etiquetas sin espacios de más, sin vacías y sin repetidas (comparando por slug). */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const name = raw.replace(/\s+/g, " ").trim().slice(0, 40);
    const slug = slugify(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    result.push(name);
  }
  return result;
}

function parseInput(input: ArticleInput) {
  const parsed = articleInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    throw new ArticleError("invalid", "Revisá los campos marcados.", fieldErrors);
  }
  const content = sanitizeDoc(parsed.data.content);
  if (JSON.stringify(content).length > MAX_CONTENT_BYTES) {
    throw new ArticleError("invalid", "La nota es demasiado larga.", {
      content: "La nota es demasiado larga.",
    });
  }
  const contentText = extractPlainText(content);
  return { ...parsed.data, content, contentText, readingTimeMinutes: readingTimeMinutes(contentText) };
}

async function slugIsTaken(tx: Prisma.TransactionClient, candidate: string, articleId?: string) {
  const [article, history] = await Promise.all([
    tx.article.findUnique({ where: { slug: candidate }, select: { id: true } }),
    tx.articleSlugHistory.findUnique({ where: { slug: candidate }, select: { articleId: true } }),
  ]);
  if (article && article.id !== articleId) return true;
  // Un slug viejo de la misma nota se puede recuperar; el de otra nota, no.
  return Boolean(history && history.articleId !== articleId);
}

async function connectTags(tx: Prisma.TransactionClient, names: string[]) {
  const ids: string[] = [];
  for (const name of names) {
    const slug = slugify(name);
    const tag =
      (await tx.tag.findUnique({ where: { slug }, select: { id: true } })) ??
      (await tx.tag.create({ data: { name, slug }, select: { id: true } }));
    ids.push(tag.id);
  }
  return ids;
}

async function assertCategory(tx: Prisma.TransactionClient, categoryId: string) {
  const category = await tx.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) {
    throw new ArticleError("invalid", "Revisá los campos marcados.", { categoryId: "Elegí una categoría." });
  }
}

/** Engancha la imagen principal y guarda sus textos. Devuelve el id o null. */
async function attachMainImage(tx: Prisma.TransactionClient, data: ReturnType<typeof parseInput>) {
  if (!data.mainImageId) return null;
  const { count } = await tx.media.updateMany({
    where: { id: data.mainImageId },
    data: { altText: data.mainImageAlt, caption: data.mainImageCaption, credit: data.mainImageCredit },
  });
  if (count !== 1) {
    throw new ArticleError("invalid", "Revisá los campos marcados.", {
      mainImage: "La imagen ya no está disponible. Subila de nuevo.",
    });
  }
  return data.mainImageId;
}

/** Sólo una nota por puesto destacado: al asignar el puesto 1 a esta, se lo saca a la que lo tenía. */
async function claimFeaturedRank(tx: Prisma.TransactionClient, rank: number | null, articleId: string) {
  if (rank === null) return;
  await tx.article.updateMany({
    where: { featuredRank: rank, id: { not: articleId } },
    data: { featuredRank: null },
  });
}

const RETURN = { id: true, slug: true, title: true, status: true } as const;

/** Crea una nota en borrador. Nunca nace publicada: eso es una transición aparte. */
export async function createArticle(actor: Actor, input: ArticleInput) {
  if (!can(actor, "article:create")) throw new ArticleError("forbidden", "No tenés permiso.");
  const data = parseInput(input);

  return db.$transaction(async (tx) => {
    await assertCategory(tx, data.categoryId);
    const slug = await uniqueSlug(slugify(data.slug || data.title), (c) => slugIsTaken(tx, c));
    const tagIds = await connectTags(tx, data.tags);
    const mainImageId = await attachMainImage(tx, data);
    await claimFeaturedRank(tx, data.featuredRank, "");
    const article = await tx.article.create({
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt,
        content: data.content,
        contentText: data.contentText,
        readingTimeMinutes: data.readingTimeMinutes,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        categoryId: data.categoryId,
        authorId: actor.id,
        featuredRank: data.featuredRank,
        mainImageId,
        status: "DRAFT",
        origin: "MANUAL",
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
      select: RETURN,
    });
    await recordArticleEvent(tx, "ARTICLE_CREATED", { articleId: article.id, ...pick(article) }, actor.id);
    return article;
  });
}

/** Guarda cambios de contenido y metadatos. No cambia el estado. */
export async function updateArticle(actor: Actor, id: string, input: ArticleInput) {
  const data = parseInput(input);

  return db.$transaction(async (tx) => {
    const current = await tx.article.findUnique({
      where: { id },
      select: { id: true, slug: true, authorId: true, publishedAt: true },
    });
    if (!current) throw new ArticleError("not-found", "La nota no existe.");
    if (!can(actor, "article:edit", { ownerId: current.authorId })) {
      throw new ArticleError("forbidden", "No tenés permiso.");
    }
    await assertCategory(tx, data.categoryId);

    const wanted = slugify(data.slug || data.title);
    let slug = current.slug;
    if (wanted && wanted !== current.slug) {
      if (await slugIsTaken(tx, wanted, id)) {
        throw new ArticleError("invalid", "Revisá los campos marcados.", {
          slug: "Esa dirección ya la usa otra nota.",
        });
      }
      slug = wanted;
      // Si la nota ya salió alguna vez, la dirección vieja tiene que seguir llevando a ella (301).
      if (current.publishedAt) {
        await tx.articleSlugHistory.upsert({
          where: { slug: current.slug },
          create: { slug: current.slug, articleId: id },
          update: {},
        });
      }
      await tx.articleSlugHistory.deleteMany({ where: { slug, articleId: id } });
    }

    const tagIds = await connectTags(tx, data.tags);
    const mainImageId = await attachMainImage(tx, data);
    await claimFeaturedRank(tx, data.featuredRank, id);
    const article = await tx.article.update({
      where: { id },
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt,
        content: data.content,
        contentText: data.contentText,
        readingTimeMinutes: data.readingTimeMinutes,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        categoryId: data.categoryId,
        featuredRank: data.featuredRank,
        mainImageId,
        tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) },
      },
      select: RETURN,
    });
    await recordArticleEvent(tx, "ARTICLE_UPDATED", { articleId: id, ...pick(article) }, actor.id);
    return article;
  });
}

const TRANSITION: Record<
  Exclude<ArticleTransition, "delete">,
  { permission: "article:publish"; event: (from: ArticleStatus) => ArticleEventType }
> = {
  publish: { permission: "article:publish", event: () => "ARTICLE_PUBLISHED" },
  schedule: { permission: "article:publish", event: () => "ARTICLE_SCHEDULED" },
  unpublish: {
    permission: "article:publish",
    event: (from) => (from === "PUBLISHED" ? "ARTICLE_UNPUBLISHED" : "ARTICLE_UPDATED"),
  },
  archive: { permission: "article:publish", event: () => "ARTICLE_ARCHIVED" },
};

/**
 * Cambia el estado de una nota. El `WHERE status IN (...)` hace que dos pedidos
 * simultáneos no puedan aplicar la misma transición dos veces.
 */
export async function transitionArticle(
  actor: Actor,
  id: string,
  transition: Exclude<ArticleTransition, "delete">,
  options: { now?: Date; scheduledAt?: Date | null } = {},
) {
  const now = options.now ?? new Date();
  const rule = TRANSITION[transition];
  if (!can(actor, rule.permission)) throw new ArticleError("forbidden", "No tenés permiso para publicar.");

  return db.$transaction(async (tx) => {
    const current = await tx.article.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        excerpt: true,
        contentText: true,
        mainImage: { select: { altText: true } },
      },
    });
    if (!current) throw new ArticleError("not-found", "La nota no existe.");
    if (!canTransition(transition, current.status)) {
      throw new ArticleError("conflict", "La nota ya no está en un estado que permita este cambio.");
    }

    if (transition === "publish" || transition === "schedule") {
      const missing: Record<string, string> = {};
      if (!current.excerpt) missing.excerpt = "Para publicar hace falta la bajada.";
      if (!current.contentText) missing.content = "Para publicar hace falta el cuerpo de la nota.";
      if (current.mainImage && !current.mainImage.altText) {
        missing.mainImageAlt = "Describí la imagen: la leen los lectores de pantalla y los buscadores.";
      }
      if (Object.keys(missing).length > 0) {
        throw new ArticleError("invalid", "La nota se guardó, pero todavía no se puede publicar.", missing);
      }
    }

    let data: Prisma.ArticleUpdateManyMutationInput;
    switch (transition) {
      case "publish":
        data = { status: "PUBLISHED", publishedAt: now, scheduledAt: null, archivedAt: null };
        break;
      case "schedule": {
        const at = options.scheduledAt;
        if (!at || at.getTime() <= now.getTime()) {
          throw new ArticleError("invalid", "Revisá los campos marcados.", {
            scheduledAt: "Elegí una fecha y hora futuras.",
          });
        }
        data = { status: "SCHEDULED", scheduledAt: at };
        break;
      }
      case "unpublish":
        data = { status: "DRAFT", scheduledAt: null, archivedAt: null };
        break;
      case "archive":
        data = { status: "ARCHIVED", archivedAt: now, scheduledAt: null, featuredRank: null };
        break;
    }

    const { count } = await tx.article.updateMany({
      where: { id, status: { in: [...allowedFrom(transition)] } },
      data,
    });
    if (count !== 1) throw new ArticleError("conflict", "La nota cambió mientras tanto. Recargá la página.");

    const article = await tx.article.findUniqueOrThrow({
      where: { id },
      select: { ...RETURN, scheduledAt: true, publishedAt: true },
    });
    await recordArticleEvent(
      tx,
      rule.event(current.status),
      {
        articleId: id,
        ...pick(article),
        from: current.status,
        trigger: "editor",
        ...(article.scheduledAt ? { scheduledAt: article.scheduledAt.toISOString() } : {}),
        ...(article.publishedAt ? { publishedAt: article.publishedAt.toISOString() } : {}),
      },
      actor.id,
    );
    return article;
  });
}

/** Elimina una nota en borrador o archivada. Las publicadas se archivan antes. */
export async function deleteArticle(actor: Actor, id: string) {
  if (!can(actor, "article:delete")) throw new ArticleError("forbidden", "No tenés permiso.");
  return db.$transaction(async (tx) => {
    const current = await tx.article.findUnique({ where: { id }, select: RETURN });
    if (!current) throw new ArticleError("not-found", "La nota no existe.");
    const { count } = await tx.article.deleteMany({
      where: { id, status: { in: [...allowedFrom("delete")] } },
    });
    if (count !== 1) {
      throw new ArticleError("conflict", "Sólo se pueden eliminar borradores y notas archivadas.");
    }
    await recordArticleEvent(tx, "ARTICLE_DELETED", { articleId: id, ...pick(current) }, actor.id);
    return current;
  });
}

function pick(article: { slug: string; title: string; status: ArticleStatus }) {
  return { slug: article.slug, title: article.title, status: article.status };
}
