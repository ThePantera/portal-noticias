/**
 * Coberturas en vivo y galerías de fotos: reglas que comparten el panel y el servidor.
 */

/** Largo máximo de una actualización en vivo: un par de párrafos cortos. */
export const LIVE_UPDATE_MAX_LENGTH = 1000;

/** Fotos por galería: más que esto ya no se mira en el celular. */
export const GALLERY_MAX_IMAGES = 20;

/** Largo máximo de la descripción, el epígrafe y el crédito de una foto de la galería. */
export const GALLERY_TEXT_MAX_LENGTH = 200;

/** Cada cuánto se refresca sola una nota con cobertura en vivo (milisegundos). */
export const LIVE_REFRESH_MS = 60_000;

export type TextCheck = { ok: true; value: string } | { ok: false; message: string };

/** Limpia el texto de una actualización: sin espacios de más y sin más de una línea en blanco seguida. */
export function checkLiveUpdate(input: string): TextCheck {
  const value = input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!value) return { ok: false, message: "Escribí la actualización." };
  if (value.length > LIVE_UPDATE_MAX_LENGTH) {
    return { ok: false, message: `Máximo ${LIVE_UPDATE_MAX_LENGTH} caracteres.` };
  }
  return { ok: true, value };
}

/** Descripción, epígrafe o crédito de una foto; la descripción es obligatoria. */
export function checkGalleryText(input: string, required: boolean): TextCheck {
  const value = input.replace(/\s+/g, " ").trim();
  if (required && !value) {
    return { ok: false, message: "Describí la foto: la leen los lectores de pantalla y los buscadores." };
  }
  if (value.length > GALLERY_TEXT_MAX_LENGTH) {
    return { ok: false, message: `Máximo ${GALLERY_TEXT_MAX_LENGTH} caracteres.` };
  }
  return { ok: true, value };
}

/** Párrafos de una actualización en vivo, para mostrarla sin HTML. */
export function liveUpdateParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
