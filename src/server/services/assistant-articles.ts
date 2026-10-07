import "server-only";
import { z } from "zod";
import type { EditorNode } from "@/lib/content";
import { db } from "@/server/db";
import type { Actor } from "@/server/permissions";
import {
  ArticleError,
  articleInputSchema,
  createArticle,
  deleteArticle,
  transitionArticle,
  updateArticle,
  type ArticleInput,
} from "./article-commands";
import { getArticleForEdit } from "./articles";
import { CommonsError, downloadCommonsPhoto } from "./commons";
import { MediaError, uploadImage } from "./media";

/**
 * Notas que maneja el asistente de redacción por la API (ADR 0008). Firma con un usuario
 * propio con rol EDITOR: crea, corrige, publica, programa, archiva y elimina, pero no
 * administra usuarios. Pasa por los mismos servicios que el panel, con sus mismas
 * validaciones, eventos y reglas de estado.
 */

export const ASSISTANT_EMAIL = "asistente@portal-noticias.invalid";
export const ASSISTANT_NAME = "Redacción";
/** Tope de notas nuevas por 24 horas: si la llave se filtra, el daño queda acotado. */
export const MAX_ARTICLES_PER_DAY = 20;
/** La imagen viaja en base64 (pesa 4/3) y Vercel corta los pedidos en 4,5 MB. */
export const MAX_ASSISTANT_IMAGE_BYTES = 3 * 1024 * 1024;

export class AssistantError extends Error {
  constructor(
    readonly code: "invalid" | "forbidden" | "not-found" | "conflict" | "rate-limited" | "unavailable",
    message: string,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

const sourceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.url({ protocol: /^https?$/, message: "Tiene que ser una dirección http o https." }).max(500),
});

/**
 * La imagen llega de una de dos formas: los bytes en base64 (con crédito obligatorio) o el
 * título de una foto de Wikimedia Commons, que el sitio descarga y acredita solo (ADR 0009).
 */
const imageSchema = z
  .object({
    /** Bytes de la imagen en base64. */
    data: z.base64("La imagen tiene que venir en base64.").optional(),
    /** Título de un archivo de Commons, por ejemplo "File:Obelisco de Buenos Aires.jpg". */
    commons: z
      .string()
      .trim()
      .regex(/^File:.+/, 'Tiene que ser el título del archivo, empezando con "File:".')
      .max(250)
      .optional(),
    alt: z.string().trim().min(1, "Falta la descripción de la imagen.").max(200),
    caption: z.string().max(300).optional(),
    /** Autor y licencia: sin crédito no se usa una foto. Con `commons`, si falta, se arma solo. */
    credit: z.string().trim().min(1, "Falta el crédito de la imagen.").max(120).optional(),
  })
  .refine((v) => Boolean(v.data) !== Boolean(v.commons), {
    path: ["data"],
    message: "Mandá la imagen en `data` (base64) o en `commons`, una de las dos.",
  })
  .refine((v) => !v.data || v.credit, { path: ["credit"], message: "Falta el crédito de la imagen." });

type ImageField = z.output<typeof imageSchema>;

/** Qué hacer con la nota después de guardarla. Sin `action`, queda como estaba (o en borrador). */
const actionSchema = z
  .object({
    action: z.enum(["draft", "publish", "schedule", "unpublish", "archive"]).optional(),
    /** Con zona horaria, por ejemplo 2026-10-07T08:00:00-03:00. */
    scheduledAt: z.iso.datetime({ offset: true, message: "Fecha con zona horaria, en ISO 8601." }).optional(),
  })
  .refine((v) => v.action !== "schedule" || v.scheduledAt, {
    path: ["scheduledAt"],
    message: "Para programar hace falta la fecha.",
  });

export const createSchema = z
  .object({
    title: z.string(),
    excerpt: z.string().default(""),
    content: z.unknown(),
    category: z.string().trim().min(1, "Falta la sección."),
    tags: z.array(z.string()).max(20).default([]),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    /** De dónde sale la información. Se citan al final de la nota. */
    sources: z.array(sourceSchema).min(1, "Hace falta al menos una fuente.").max(10, "Máximo 10 fuentes."),
    image: imageSchema.optional(),
  })
  .and(actionSchema);

/** Corrección: sólo los campos que cambian. `image: null` saca la foto. */
export const updateSchema = z
  .object({
    title: z.string().optional(),
    excerpt: z.string().optional(),
    content: z.unknown().optional(),
    category: z.string().trim().min(1).optional(),
    tags: z.array(z.string()).max(20).optional(),
    seoTitle: z.string().nullable().optional(),
    seoDescription: z.string().nullable().optional(),
    /** Si viene, se agrega al final del cuerpo un párrafo "Fuentes". */
    sources: z.array(sourceSchema).min(1).max(10).optional(),
    image: imageSchema.nullable().optional(),
    imageAlt: z.string().optional(),
    imageCaption: z.string().nullable().optional(),
    imageCredit: z.string().nullable().optional(),
  })
  .and(actionSchema);

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

function parse<T extends z.ZodType>(schema: T, raw: unknown): z.output<T> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    throw new AssistantError("invalid", "Revisá los campos marcados.", fieldErrorsOf(parsed.error));
  return parsed.data;
}

/** Usuario del asistente. Inactivo y sin contraseña válida: nunca puede iniciar sesión en el panel. */
export async function assistantActor(): Promise<Actor> {
  const user = await db.user.upsert({
    where: { email: ASSISTANT_EMAIL },
    update: {},
    create: {
      email: ASSISTANT_EMAIL,
      name: ASSISTANT_NAME,
      passwordHash: "!",
      role: "EDITOR",
      isActive: false,
    },
    select: { id: true },
  });
  // El rol sale de acá y no de la base: si alguien lo sube a ADMIN, igual no administra usuarios.
  return { id: user.id, role: "EDITOR" };
}

/** Párrafo "Fuentes: A, B." con enlaces. */
function sourcesParagraph(sources: z.output<typeof sourceSchema>[]): EditorNode {
  const content: EditorNode[] = [{ type: "text", text: "Fuentes: ", marks: [{ type: "bold" }] }];
  sources.forEach((source, index) => {
    if (index > 0) content.push({ type: "text", text: ", " });
    content.push({ type: "text", text: source.name, marks: [{ type: "link", attrs: { href: source.url } }] });
  });
  content.push({ type: "text", text: "." });
  return { type: "paragraph", content };
}

function withSources(content: unknown, sources: z.output<typeof sourceSchema>[] | undefined): unknown {
  const doc = content as EditorNode | null;
  if (!sources || !doc || typeof doc !== "object" || doc.type !== "doc" || !Array.isArray(doc.content)) {
    return content;
  }
  return { ...doc, content: [...doc.content, sourcesParagraph(sources)] };
}

async function categoryId(slug: string): Promise<string> {
  const category = await db.category.findFirst({ where: { slug, isActive: true }, select: { id: true } });
  if (!category)
    throw new AssistantError("invalid", "Revisá los campos marcados.", {
      category: "No existe esa sección.",
    });
  return category.id;
}

/** Valida el texto antes de subir la imagen: si no pasa, no queda una imagen huérfana. */
function assertArticle(article: ArticleInput) {
  const check = articleInputSchema.safeParse(article);
  if (!check.success)
    throw new AssistantError("invalid", "Revisá los campos marcados.", fieldErrorsOf(check.error));
}

/** Bytes y crédito de la imagen pedida: los que vinieron en base64 o la foto de Commons. */
async function resolveImage(image: ImageField): Promise<{ bytes: Buffer; credit: string }> {
  if (image.data) {
    const bytes = Buffer.from(image.data, "base64");
    if (bytes.length > MAX_ASSISTANT_IMAGE_BYTES) {
      throw new AssistantError("invalid", "Revisá los campos marcados.", {
        image: "La imagen supera los 3 MB.",
      });
    }
    return { bytes, credit: image.credit ?? "" };
  }
  try {
    const { photo, bytes } = await downloadCommonsPhoto(image.commons ?? "");
    return { bytes, credit: image.credit ?? photo.credit };
  } catch (error) {
    if (error instanceof CommonsError) {
      throw new AssistantError(error.code, error.message, { "image.commons": error.message });
    }
    throw error;
  }
}

/** Sube la imagen pedida y devuelve su id y el crédito que le corresponde. */
async function upload(actor: Actor, image: ImageField): Promise<{ id: string; credit: string }> {
  const { bytes, credit } = await resolveImage(image);
  try {
    return { id: (await uploadImage(actor, bytes)).id, credit };
  } catch (error) {
    if (error instanceof MediaError) {
      throw new AssistantError(error.code === "invalid" ? "invalid" : "unavailable", error.message, {
        image: error.message,
      });
    }
    throw error;
  }
}

/** Traduce los errores del servicio de notas a los de la API. */
async function translate<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ArticleError) {
      throw new AssistantError(error.code, error.message, error.fieldErrors);
    }
    throw error;
  }
}

type Action = z.output<typeof actionSchema>;

/** Aplica la acción pedida. Devuelve el estado final de la nota. */
async function applyAction(actor: Actor, id: string, { action, scheduledAt }: Action) {
  if (!action || action === "draft") return null;
  return translate(() =>
    transitionArticle(actor, id, action, { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
  );
}

/** Secciones activas, para elegir el slug. */
export function listAssistantCategories() {
  return db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
  });
}

/** Últimas notas del portal (de cualquier autor), para no repetir temas y para encontrar qué corregir. */
export function listLatestArticles(limit = 50) {
  return db.article.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      origin: true,
      createdAt: true,
      publishedAt: true,
      scheduledAt: true,
      category: { select: { slug: true } },
    },
  });
}

export function getAssistantArticle(id: string) {
  return getArticleForEdit(id);
}

/** Crea una nota (AI_ASSISTED) y, si se pide, la publica o la programa. */
export async function createAssistantArticle(raw: unknown) {
  const input = parse(createSchema, raw);
  const actor = await assistantActor();

  const recent = await db.article.count({
    where: { authorId: actor.id, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) } },
  });
  if (recent >= MAX_ARTICLES_PER_DAY) {
    throw new AssistantError("rate-limited", `Se alcanzó el tope de ${MAX_ARTICLES_PER_DAY} notas por día.`);
  }

  const article: ArticleInput = {
    title: input.title,
    excerpt: input.excerpt,
    content: withSources(input.content, input.sources),
    categoryId: await categoryId(input.category),
    tags: input.tags,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    mainImageAlt: input.image?.alt ?? "",
    mainImageCaption: input.image?.caption,
    // Con Commons el crédito se arma al descargar; mientras tanto se valida con uno provisorio.
    mainImageCredit: input.image ? (input.image.credit ?? "Wikimedia Commons") : undefined,
  };
  assertArticle(article);
  if (input.image) {
    const uploaded = await upload(actor, input.image);
    article.mainImageId = uploaded.id;
    article.mainImageCredit = uploaded.credit;
  }

  const created = await translate(() => createArticle(actor, article, { origin: "AI_ASSISTED" }));
  try {
    return (await applyAction(actor, created.id, input)) ?? created;
  } catch (error) {
    // La nota quedó guardada como borrador: se avisa con su id para corregirla y reintentar.
    if (error instanceof AssistantError) {
      throw new AssistantError(error.code, `${error.message} La nota quedó en borrador (id ${created.id}).`, {
        ...error.fieldErrors,
        id: created.id,
      });
    }
    throw error;
  }
}

/** Corrige una nota existente (de cualquier autor) y aplica la acción pedida. */
export async function updateAssistantArticle(id: string, raw: unknown) {
  const input = parse(updateSchema, raw);
  const actor = await assistantActor();
  const current = await getArticleForEdit(id);
  if (!current) throw new AssistantError("not-found", "La nota no existe.");

  const image = current.mainImage;
  const article: ArticleInput = {
    title: input.title ?? current.title,
    excerpt: input.excerpt ?? current.excerpt,
    content: withSources(input.content ?? current.content, input.sources),
    categoryId: input.category ? await categoryId(input.category) : current.categoryId,
    tags: input.tags ?? current.tags,
    slug: current.slug,
    seoTitle: (input.seoTitle === undefined ? current.seoTitle : input.seoTitle) ?? undefined,
    seoDescription:
      (input.seoDescription === undefined ? current.seoDescription : input.seoDescription) ?? undefined,
    featuredRank: current.featuredRank,
    mainImageId: input.image === null ? "" : (image?.id ?? ""),
    mainImageAlt: input.image?.alt ?? input.imageAlt ?? image?.alt ?? "",
    mainImageCaption:
      input.image?.caption ??
      (input.imageCaption === undefined ? image?.caption : input.imageCaption) ??
      undefined,
    mainImageCredit: input.image
      ? (input.image.credit ?? "Wikimedia Commons")
      : ((input.imageCredit === undefined ? image?.credit : input.imageCredit) ?? undefined),
  };
  assertArticle(article);
  if (input.image) {
    const uploaded = await upload(actor, input.image);
    article.mainImageId = uploaded.id;
    article.mainImageCredit = uploaded.credit;
  }

  const updated = await translate(() => updateArticle(actor, id, article));
  return (await applyAction(actor, id, input)) ?? updated;
}

/**
 * Elimina una nota. Si está publicada o programada, primero la archiva (las reglas de
 * estado no dejan borrar algo visible de un solo paso).
 */
export async function deleteAssistantArticle(id: string) {
  const actor = await assistantActor();
  const current = await db.article.findUnique({ where: { id }, select: { status: true } });
  if (!current) throw new AssistantError("not-found", "La nota no existe.");
  if (current.status === "PUBLISHED" || current.status === "SCHEDULED") {
    await translate(() => transitionArticle(actor, id, "archive"));
  }
  return translate(() => deleteArticle(actor, id));
}
