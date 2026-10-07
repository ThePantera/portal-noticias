import { connection } from "next/server";
import { NO_STORE, rejectUnauthorized } from "@/server/assistant-api";
import { CommonsError, searchCommonsPhotos } from "@/server/services/commons";

/**
 * Busca fotos con licencia libre en Wikimedia Commons para el asistente (ADR 0009).
 * GET ?q=texto → candidatas con título, licencia, autor y crédito. Para usar una, se manda
 * su `title` en `image.commons` al crear o corregir la nota.
 */
export async function GET(request: Request) {
  await connection();
  const denied = rejectUnauthorized(request);
  if (denied) return denied;
  const text = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (text.length < 2 || text.length > 120) {
    return Response.json(
      { error: "Mandá una búsqueda de 2 a 120 caracteres en ?q=." },
      { status: 422, headers: NO_STORE },
    );
  }
  try {
    return Response.json({ photos: await searchCommonsPhotos(text) }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof CommonsError) {
      return Response.json({ error: error.message }, { status: 503, headers: NO_STORE });
    }
    console.error("API del asistente: falló la búsqueda de fotos", error);
    return Response.json({ error: "No se pudo completar el pedido." }, { status: 500, headers: NO_STORE });
  }
}
