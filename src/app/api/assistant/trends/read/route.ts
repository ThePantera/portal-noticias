import { connection } from "next/server";
import { NO_STORE, rejectUnauthorized } from "@/server/assistant-api";
import { readSourceArticle, TrendsError } from "@/server/services/trends";

/**
 * Texto de una nota de un medio de la lista, para que el asistente la lea como fuente y
 * escriba la suya con sus palabras (ADR 0011). GET ?url=https://…
 */
export async function GET(request: Request) {
  await connection();
  const denied = rejectUnauthorized(request);
  if (denied) return denied;
  const url = new URL(request.url).searchParams.get("url")?.trim() ?? "";
  try {
    return Response.json(await readSourceArticle(url), { headers: NO_STORE });
  } catch (error) {
    if (error instanceof TrendsError) {
      return Response.json(
        { error: error.message },
        { status: error.code === "invalid" ? 422 : 503, headers: NO_STORE },
      );
    }
    console.error("API del asistente: falló la lectura de la nota", error);
    return Response.json({ error: "No se pudo completar el pedido." }, { status: 500, headers: NO_STORE });
  }
}
