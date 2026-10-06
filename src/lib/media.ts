import type { ImageFormat, MediaVariant } from "@/types/media";

/**
 * Reglas de imágenes que comparten el navegador y el servidor. El servidor vuelve a
 * validar todo: lo que hace el navegador es sólo para no subir archivos enormes.
 */

/** Vercel corta los pedidos de más de 4,5 MB: el archivo tiene que entrar con margen. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
/** El navegador achica las fotos más grandes que esto (lado mayor) antes de subirlas. */
export const MAX_UPLOAD_EDGE = 2400;
export const MIN_IMAGE_WIDTH = 320;
/** Tope de píxeles que se aceptan decodificar (protege la memoria del servidor). */
export const MAX_IMAGE_PIXELS = 40_000_000;
export const VARIANT_WIDTHS = [480, 960, 1600, 2400] as const;
export const OG_SIZE = { width: 1200, height: 630 } as const;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

export const MIME_BY_FORMAT: Record<ImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

const EXTENSION: Record<ImageFormat, string> = { jpeg: "jpg", png: "png", webp: "webp", avif: "avif" };

export function extensionFor(format: ImageFormat): string {
  return EXTENSION[format];
}

/**
 * Formato real del archivo según sus primeros bytes. No se confía en el nombre ni en el
 * tipo que declara el navegador: un SVG o un HTML renombrado a .jpg no pasa.
 */
export function detectImageFormat(bytes: Uint8Array): ImageFormat | null {
  const at = (offset: number, ...values: number[]) => values.every((v, i) => bytes[offset + i] === v);
  const ascii = (offset: number, text: string) => at(offset, ...Array.from(text, (c) => c.charCodeAt(0)));

  if (at(0, 0xff, 0xd8, 0xff)) return "jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "webp";
  if (ascii(4, "ftyp") && (ascii(8, "avif") || ascii(8, "avis"))) return "avif";
  return null;
}

/** Anchos de las variantes para una imagen: los estándar que entran, más el ancho propio si es menor. */
export function variantWidths(width: number): number[] {
  const widths: number[] = VARIANT_WIDTHS.filter((w) => w < width);
  const largest = Math.min(width, VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1]);
  if (!widths.includes(largest)) widths.push(largest);
  return widths;
}

/** `srcset` con las variantes de pantalla (no el recorte para redes). */
export function buildSrcSet(variants: MediaVariant[], url: (key: string) => string): string {
  return variants
    .filter((v) => !v.purpose)
    .sort((a, b) => a.width - b.width)
    .map((v) => `${url(v.key)} ${v.width}w`)
    .join(", ");
}

/** La variante de pantalla más chica que llegue a `target` de ancho, o la más grande que haya. */
export function pickVariant(variants: MediaVariant[], target = 960): MediaVariant | undefined {
  const screen = variants.filter((v) => !v.purpose).sort((a, b) => a.width - b.width);
  return screen.find((v) => v.width >= target) ?? screen[screen.length - 1];
}
