import "server-only";
import { GALLERY_MAX_IMAGES, checkGalleryText, checkLiveUpdate } from "@/lib/article-extras";
import { db } from "@/server/db";
import { imageSelect, toPublicImage } from "@/server/media/public-image";
import { can, type Actor } from "@/server/permissions";
import type { EditorImage } from "@/types/media";

/**
 * Coberturas en vivo y galerías de fotos de una nota. Lo que se carga acá se ve enseguida en
 * una nota publicada, así que pide permiso de publicar (como "Publicar" en el editor).
 */

export class ExtrasError extends Error {}

export type LiveUpdateRow = { id: string; body: string; createdAt: Date };

async function assertCanPublish(actor: Actor, articleId: string) {
  if (!can(actor, "article:publish")) throw new ExtrasError("No tenés permiso para publicar.");
  const article = await db.article.findUnique({ where: { id: articleId }, select: { id: true } });
  if (!article) throw new ExtrasError("La nota no existe.");
}

/** Estado de la cobertura y sus actualizaciones, la más nueva primero. */
export async function getLiveCoverage(articleId: string) {
  const article = await db.article.findUnique({
    where: { id: articleId },
    select: {
      isLive: true,
      liveUpdates: { orderBy: { createdAt: "desc" }, select: { id: true, body: true, createdAt: true } },
    },
  });
  return article ? { isLive: article.isLive, updates: article.liveUpdates } : null;
}

export async function setLive(actor: Actor, articleId: string, isLive: boolean) {
  await assertCanPublish(actor, articleId);
  await db.article.update({ where: { id: articleId }, data: { isLive } });
}

export async function addLiveUpdate(actor: Actor, articleId: string, text: string) {
  const checked = checkLiveUpdate(text);
  if (!checked.ok) throw new ExtrasError(checked.message);
  await assertCanPublish(actor, articleId);
  // Sumar una actualización deja la cobertura activa aunque no se haya marcado antes.
  await db.$transaction([
    db.articleLiveUpdate.create({ data: { articleId, body: checked.value } }),
    db.article.update({ where: { id: articleId }, data: { isLive: true } }),
  ]);
}

/** Borra una actualización y devuelve la nota a la que pertenecía. */
export async function deleteLiveUpdate(actor: Actor, updateId: string): Promise<string> {
  const update = await db.articleLiveUpdate.findUnique({
    where: { id: updateId },
    select: { articleId: true },
  });
  if (!update) throw new ExtrasError("La actualización ya no existe.");
  await assertCanPublish(actor, update.articleId);
  await db.articleLiveUpdate.delete({ where: { id: updateId } });
  return update.articleId;
}

/** Fotos de la galería en orden, como las maneja el panel. */
export async function listGallery(articleId: string): Promise<EditorImage[]> {
  const rows = await db.articleMedia.findMany({
    where: { articleId },
    orderBy: { position: "asc" },
    select: { media: { select: { id: true, ...imageSelect } } },
  });
  return rows.map(({ media }) => ({ ...toPublicImage(media), id: media.id }));
}

/** Suma al final de la galería una foto ya subida, con su descripción, epígrafe y crédito. */
export async function addGalleryImage(
  actor: Actor,
  articleId: string,
  input: { mediaId: string; alt: string; caption: string; credit: string },
) {
  const alt = checkGalleryText(input.alt, true);
  if (!alt.ok) throw new ExtrasError(alt.message);
  const caption = checkGalleryText(input.caption, false);
  if (!caption.ok) throw new ExtrasError(caption.message);
  const credit = checkGalleryText(input.credit, false);
  if (!credit.ok) throw new ExtrasError(credit.message);
  await assertCanPublish(actor, articleId);

  await db.$transaction(async (tx) => {
    const current = await tx.articleMedia.aggregate({
      where: { articleId },
      _count: true,
      _max: { position: true },
    });
    if (current._count >= GALLERY_MAX_IMAGES) {
      throw new ExtrasError(`La galería admite hasta ${GALLERY_MAX_IMAGES} fotos.`);
    }
    const { count } = await tx.media.updateMany({
      where: { id: input.mediaId },
      data: { altText: alt.value, caption: caption.value || null, credit: credit.value || null },
    });
    if (count === 0) throw new ExtrasError("La foto no existe. Subila de nuevo.");
    await tx.articleMedia.upsert({
      where: { articleId_mediaId: { articleId, mediaId: input.mediaId } },
      create: { articleId, mediaId: input.mediaId, position: (current._max.position ?? -1) + 1 },
      update: {},
    });
  });
}

/** Saca una foto de la galería (la foto sigue guardada, por si se usa en otra nota). */
export async function removeGalleryImage(actor: Actor, articleId: string, mediaId: string) {
  await assertCanPublish(actor, articleId);
  await db.articleMedia.deleteMany({ where: { articleId, mediaId } });
}

/** Mueve una foto un lugar hacia adelante (-1) o hacia atrás (+1). */
export async function moveGalleryImage(actor: Actor, articleId: string, mediaId: string, step: -1 | 1) {
  await assertCanPublish(actor, articleId);
  await db.$transaction(async (tx) => {
    const rows = await tx.articleMedia.findMany({
      where: { articleId },
      orderBy: { position: "asc" },
      select: { mediaId: true },
    });
    const from = rows.findIndex((r) => r.mediaId === mediaId);
    const to = from + step;
    if (from < 0 || to < 0 || to >= rows.length) return;
    const order = rows.map((r) => r.mediaId);
    [order[from], order[to]] = [order[to], order[from]];
    for (const [position, id] of order.entries()) {
      await tx.articleMedia.update({
        where: { articleId_mediaId: { articleId, mediaId: id } },
        data: { position },
      });
    }
  });
}
