import "server-only";
import { db } from "@/server/db";
import { ImageRejectedError, processImage } from "@/server/media/process";
import { imageSelect, toPublicImage } from "@/server/media/public-image";
import { StorageNotConfiguredError, getUploadDriver } from "@/server/media/storage";
import { can, type Actor } from "@/server/permissions";
import type { EditorImage } from "@/types/media";

export class MediaError extends Error {
  constructor(
    readonly code: "forbidden" | "invalid" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}

/**
 * Sube una imagen: la valida, guarda el original limpio y sus variantes, y la registra.
 * Si falla el registro en la base, borra los archivos para no dejar huérfanos.
 */
export async function uploadImage(actor: Actor, bytes: Buffer): Promise<EditorImage> {
  if (!can(actor, "media:upload")) throw new MediaError("forbidden", "No tenés permiso para subir imágenes.");

  let driver;
  try {
    driver = getUploadDriver();
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      console.error("Subida de imagen: almacenamiento sin configurar.", error.message);
      throw new MediaError(
        "unavailable",
        "Falta configurar dónde se guardan las imágenes. Revisá el paso 10 de la guía de deploy.",
      );
    }
    throw error;
  }

  let image;
  try {
    image = await processImage(bytes);
  } catch (error) {
    if (error instanceof ImageRejectedError) throw new MediaError("invalid", error.message);
    throw error;
  }

  const stored: string[] = [];
  try {
    // allSettled y no all: si uno falla, hay que esperar a los demás para saber qué borrar.
    const results = await Promise.allSettled(
      image.files.map(async (file) => {
        await driver.put(file.key, file.body, file.contentType);
        stored.push(file.key);
      }),
    );
    const failed = results.find((r) => r.status === "rejected");
    if (failed) throw failed.reason;
    const row = await db.media.create({
      data: {
        storageDriver: driver.name,
        storageKey: image.original.key,
        mimeType: image.original.contentType,
        sizeBytes: image.original.body.length,
        width: image.width,
        height: image.height,
        variants: image.variants,
        uploadedById: actor.id,
      },
      select: { id: true, ...imageSelect },
    });
    return { id: row.id, ...toPublicImage(row) };
  } catch (error) {
    await driver.delete(stored).catch((cleanup) => console.error("No se pudieron borrar archivos", cleanup));
    throw error;
  }
}
