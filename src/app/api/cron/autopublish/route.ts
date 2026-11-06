import { connection } from "next/server";
import { refreshArticle } from "@/server/assistant-api";
import { bearerMatches } from "@/server/auth/bearer";
import { env } from "@/server/env";
import { runAutopublish } from "@/server/services/autopublish";
import { ClaudeError } from "@/server/services/claude";

/** Leer fuentes, redactar y subir la foto lleva entre 20 y 40 segundos. */
export const maxDuration = 60;

/**
 * Publicador automático de notas de tendencia (ADR 0012). Lo llama GitHub Actions
 * (.github/workflows/notas-automaticas.yml) con `Authorization: Bearer $CRON_SECRET`.
 * Publica como mucho una nota por llamada. Sin CRON_SECRET o sin ANTHROPIC_API_KEY responde 503.
 */
async function handle(request: Request) {
  await connection();
  const headers = { "Cache-Control": "no-store" };
  if (!env.CRON_SECRET) {
    return Response.json({ error: "CRON_SECRET no está configurado." }, { status: 503, headers });
  }
  if (!bearerMatches(request.headers.get("authorization"), env.CRON_SECRET)) {
    return Response.json({ error: "No autorizado." }, { status: 401, headers });
  }

  try {
    const result = await runAutopublish();
    if (result.status === "published") refreshArticle(result.article.id);
    return Response.json(result, { headers });
  } catch (error) {
    if (error instanceof ClaudeError) {
      const status = error.code === "unconfigured" ? 503 : 502;
      return Response.json({ error: error.message }, { status, headers });
    }
    console.error("Publicador automático: falló", error);
    return Response.json({ error: "No se pudo publicar." }, { status: 500, headers });
  }
}

export const GET = handle;
export const POST = handle;
