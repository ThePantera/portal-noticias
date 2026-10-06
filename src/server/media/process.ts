import "server-only";
import { randomUUID } from "node:crypto";
import sharp, { type OutputInfo, type Sharp } from "sharp";
import {
  MAX_IMAGE_PIXELS,
  MAX_UPLOAD_BYTES,
  MIME_BY_FORMAT,
  MIN_IMAGE_WIDTH,
  OG_SIZE,
  detectImageFormat,
  extensionFor,
  variantWidths,
} from "@/lib/media";
import type { ImageFormat, MediaVariant } from "@/types/media";

/** La imagen no se acepta. El mensaje es para quien la subió. */
export class ImageRejectedError extends Error {}

export type ProcessedFile = { key: string; body: Buffer; contentType: string };

export type ProcessedImage = {
  format: ImageFormat;
  width: number;
  height: number;
  original: ProcessedFile;
  variants: MediaVariant[];
  files: ProcessedFile[];
};

const ENCODE: Record<ImageFormat, (img: Sharp) => Sharp> = {
  jpeg: (img) => img.jpeg({ quality: 88, mozjpeg: true }),
  png: (img) => img.png({ compressionLevel: 9 }),
  webp: (img) => img.webp({ quality: 88 }),
  avif: (img) => img.avif({ quality: 60 }),
};

/** Carpeta única por imagen: las claves nunca se repiten ni se sobrescriben. */
export function mediaFolder(now = new Date(), id: string = randomUUID()): string {
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `media/${now.getUTCFullYear()}/${month}/${id}`;
}

/**
 * Valida y prepara una imagen subida: el formato se detecta por los bytes, se decodifica
 * entera (un archivo dañado o disfrazado falla acá), se endereza según la orientación de
 * la cámara y se vuelve a codificar sin metadatos (EXIF con ubicación GPS, modelo, etc.).
 * Además genera las variantes WebP para `srcset` y el recorte para redes sociales.
 */
export async function processImage(bytes: Buffer, folder = mediaFolder()): Promise<ProcessedImage> {
  if (bytes.length === 0) throw new ImageRejectedError("El archivo está vacío.");
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new ImageRejectedError("La imagen pesa más de 4 MB.");
  }
  const format = detectImageFormat(bytes);
  if (!format) throw new ImageRejectedError("Sólo se aceptan imágenes JPG, PNG, WebP o AVIF.");

  const source = () =>
    sharp(bytes, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: "error", animated: false }).autoOrient();

  let original: { data: Buffer; info: OutputInfo };
  try {
    original = await ENCODE[format](source()).toBuffer({ resolveWithObject: true });
  } catch (error) {
    const tooBig = error instanceof Error && /pixel limit/i.test(error.message);
    throw new ImageRejectedError(
      tooBig ? "La imagen tiene demasiados píxeles." : "No se pudo leer la imagen. Puede estar dañada.",
    );
  }
  const { width, height } = original.info;
  if (width < MIN_IMAGE_WIDTH) {
    throw new ImageRejectedError(
      `La imagen es muy chica: tiene que medir al menos ${MIN_IMAGE_WIDTH} px de ancho.`,
    );
  }

  const files: ProcessedFile[] = [];
  const originalFile = {
    key: `${folder}/original.${extensionFor(format)}`,
    body: original.data,
    contentType: MIME_BY_FORMAT[format],
  };
  files.push(originalFile);

  const variants: MediaVariant[] = [];
  for (const w of variantWidths(width)) {
    const { data, info } = await source()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    const key = `${folder}/w${w}.webp`;
    files.push({ key, body: data, contentType: MIME_BY_FORMAT.webp });
    variants.push({ key, width: info.width, height: info.height, format: "webp", sizeBytes: data.length });
  }

  // Facebook, WhatsApp y X esperan 1200×630 y no todos leen WebP: va en JPEG.
  const og = await source()
    .resize({ ...OG_SIZE, fit: "cover", position: sharp.strategy.attention })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  const ogKey = `${folder}/og.jpg`;
  files.push({ key: ogKey, body: og.data, contentType: MIME_BY_FORMAT.jpeg });
  variants.push({
    key: ogKey,
    width: og.info.width,
    height: og.info.height,
    format: "jpeg",
    sizeBytes: og.data.length,
    purpose: "og",
  });

  return { format, width, height, original: originalFile, variants, files };
}
