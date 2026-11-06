import { connection } from "next/server";
import { NO_STORE, rejectUnauthorized } from "@/server/assistant-api";
import { getTrends } from "@/server/services/trends";

/**
 * Temas en tendencia para el asistente (ADR 0011): lee Google Trends, Google Noticias y los
 * RSS de los medios grandes, y agrupa los titulares que se repiten. GET ?min=3 fija cuántas
 * fuentes distintas tiene que tener un tema (2 a 6).
 */
export async function GET(request: Request) {
  await connection();
  const denied = rejectUnauthorized(request);
  if (denied) return denied;
  const min = Number(new URL(request.url).searchParams.get("min") ?? 3);
  const minSources = Number.isInteger(min) ? Math.min(Math.max(min, 2), 6) : 3;
  try {
    return Response.json(await getTrends(minSources), { headers: NO_STORE });
  } catch (error) {
    console.error("API del asistente: fallaron las tendencias", error);
    return Response.json({ error: "No se pudo completar el pedido." }, { status: 500, headers: NO_STORE });
  }
}
