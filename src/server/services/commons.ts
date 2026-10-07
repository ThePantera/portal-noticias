import "server-only";
import {
  COMMONS_API,
  COMMONS_UPLOAD_HOST,
  imageInfoParams,
  parseCommonsResponse,
  type CommonsPhoto,
} from "@/lib/commons";
import { MAX_UPLOAD_BYTES } from "@/lib/media";

/**
 * Consultas a Wikimedia Commons desde el servidor del sitio (ADR 0009). El asistente de
 * redacción corre en un entorno sin salida a Commons; el sitio sí la tiene, así que busca y
 * descarga las fotos por él. Sólo habla con commons.wikimedia.org y upload.wikimedia.org.
 */

/** Wikimedia pide identificar a quien consulta su API. */
const USER_AGENT = "PortalNoticias/1.0 (https://github.com/ThePantera/portal-noticias)";

export class CommonsError extends Error {
  constructor(
    readonly code: "invalid" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}

async function query(params: Record<string, string>): Promise<CommonsPhoto[]> {
  const url = `${COMMONS_API}?${new URLSearchParams({ ...imageInfoParams(), ...params })}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Commons: la consulta falló", error);
    throw new CommonsError("unavailable", "Wikimedia Commons no respondió.");
  }
  if (!response.ok) throw new CommonsError("unavailable", `Wikimedia Commons respondió ${response.status}.`);
  return parseCommonsResponse(await response.json());
}

/** Fotos con licencia libre que coinciden con la búsqueda (hasta 20 candidatas). */
export function searchCommonsPhotos(text: string): Promise<CommonsPhoto[]> {
  return query({
    generator: "search",
    gsrsearch: `${text} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "20",
  });
}

/**
 * Descarga una foto por su título ("File:…"). Vuelve a consultar la licencia en el momento:
 * no confía en lo que diga quien la pide. Devuelve los bytes y el crédito armado.
 */
export async function downloadCommonsPhoto(title: string): Promise<{ photo: CommonsPhoto; bytes: Buffer }> {
  const [photo] = await query({ titles: title });
  if (!photo) {
    throw new CommonsError(
      "invalid",
      "Esa foto no existe en Commons o su licencia no permite usarla (sólo dominio público, CC0, CC BY o CC BY-SA).",
    );
  }
  if (new URL(photo.imageUrl).hostname !== COMMONS_UPLOAD_HOST) {
    throw new CommonsError("invalid", "La dirección de la foto no es de Wikimedia.");
  }
  let response: Response;
  try {
    response = await fetch(photo.imageUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15000),
      redirect: "error",
      cache: "no-store",
    });
  } catch (error) {
    console.error("Commons: la descarga falló", error);
    throw new CommonsError("unavailable", "No se pudo descargar la foto de Wikimedia.");
  }
  if (!response.ok)
    throw new CommonsError("unavailable", `Wikimedia respondió ${response.status} a la descarga.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_UPLOAD_BYTES) throw new CommonsError("invalid", "La foto es demasiado grande.");
  return { photo, bytes };
}
