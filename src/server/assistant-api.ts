import "server-only";
import { revalidateTag } from "next/cache";
import { ARTICLES_TAG, articleTag } from "@/lib/cache-tags";
import { bearerMatches } from "@/server/auth/bearer";
import { env } from "@/server/env";
import { AssistantError } from "@/server/services/assistant-articles";

/** Piezas comunes de las rutas de /api/assistant (ADR 0008). */

export const NO_STORE = { "Cache-Control": "no-store" };
/** Vercel corta antes de 4,5 MB; esto devuelve un error legible en vez de un corte. */
const MAX_BODY_BYTES = 4_400_000;

/** null si el pedido trae la llave correcta; si no, la respuesta de rechazo. */
export function rejectUnauthorized(request: Request): Response | null {
  if (!env.ASSISTANT_API_KEY) {
    return Response.json(
      { error: "ASSISTANT_API_KEY no está configurada." },
      { status: 503, headers: NO_STORE },
    );
  }
  if (!bearerMatches(request.headers.get("authorization"), env.ASSISTANT_API_KEY)) {
    return Response.json({ error: "No autorizado." }, { status: 401, headers: NO_STORE });
  }
  return null;
}

/** Lee el cuerpo JSON con tope de tamaño. Devuelve el valor o una respuesta de error. */
export async function readJson(request: Request): Promise<{ body: unknown } | { response: Response }> {
  const tooLarge = () => ({
    response: Response.json({ error: "El pedido es demasiado grande." }, { status: 413, headers: NO_STORE }),
  });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return tooLarge();
  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) return tooLarge();
  try {
    return { body: JSON.parse(text) };
  } catch {
    return {
      response: Response.json({ error: "El cuerpo tiene que ser JSON." }, { status: 400, headers: NO_STORE }),
    };
  }
}

const STATUS: Record<AssistantError["code"], number> = {
  invalid: 422,
  forbidden: 403,
  "not-found": 404,
  conflict: 409,
  "rate-limited": 429,
  unavailable: 503,
};

/** Respuesta para un error: los conocidos con su mensaje; el resto, genérico y al log. */
export function errorResponse(error: unknown, context: string): Response {
  if (error instanceof AssistantError) {
    return Response.json(
      { error: error.message, fieldErrors: error.fieldErrors },
      { status: STATUS[error.code], headers: NO_STORE },
    );
  }
  console.error(`API del asistente: ${context}`, error);
  return Response.json({ error: "No se pudo completar el pedido." }, { status: 500, headers: NO_STORE });
}

/**
 * Invalida la caché de la portada, las secciones y la nota. `expire: 0` y no "max": una
 * corrección o una baja tiene que verse en el próximo pedido, no en el siguiente.
 */
export function refreshArticle(id: string) {
  revalidateTag(ARTICLES_TAG, { expire: 0 });
  revalidateTag(articleTag(id), { expire: 0 });
}
