import { connection } from "next/server";
import { isSameOrigin } from "@/lib/request";
import { buenosAiresDay, isArticleId, isLikelyBot } from "@/lib/views";
import { recordView } from "@/server/services/views";

/**
 * POST `{ articleId }`: suma una lectura a la nota en el día de hoy. La manda el navegador
 * del lector al abrir una nota (ViewTracker). Responde siempre 204: no hay nada que mostrar.
 */
export async function POST(request: Request) {
  await connection();
  const done = new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  if (!isSameOrigin(request) || isLikelyBot(request.headers.get("user-agent"))) return done;
  const body: unknown = await request.json().catch(() => null);
  const articleId = body && typeof body === "object" && "articleId" in body ? body.articleId : null;
  if (!isArticleId(articleId)) return done;
  try {
    await recordView(articleId, buenosAiresDay(new Date()));
  } catch (error) {
    console.error("Vistas: no se pudo sumar la lectura", error);
  }
  return done;
}
