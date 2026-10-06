import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { connection } from "next/server";
import { ARTICLES_TAG, articleTag } from "@/lib/cache-tags";
import { env } from "@/server/env";
import { publishDueArticles } from "@/server/jobs/publish-scheduled";

/**
 * Publica las notas programadas vencidas (ADR 0007). Lo llama un cron con
 * `Authorization: Bearer $CRON_SECRET`: GitHub Actions cada 5 minutos (ver
 * .github/workflows/publicar-programadas.yml) o Vercel Cron, que manda la misma cabecera.
 * Sin CRON_SECRET configurado responde 503: el endpoint nunca queda abierto.
 */
async function handle(request: Request) {
  await connection();
  const headers = { "Cache-Control": "no-store" };
  if (!env.CRON_SECRET) {
    return Response.json({ error: "CRON_SECRET no está configurado." }, { status: 503, headers });
  }
  if (!isAuthorized(request.headers.get("authorization"), env.CRON_SECRET)) {
    return Response.json({ error: "No autorizado." }, { status: 401, headers });
  }

  try {
    const published = await publishDueArticles();
    if (published.length > 0) {
      revalidateTag(ARTICLES_TAG, "max");
      for (const article of published) revalidateTag(articleTag(article.id), "max");
    }
    return Response.json({ published: published.map(({ id, slug }) => ({ id, slug })) }, { headers });
  } catch (error) {
    console.error("Publicador de programadas: falló", error);
    return Response.json({ error: "No se pudo publicar." }, { status: 500, headers });
  }
}

/** Compara en tiempo constante. Hashear antes iguala los largos, que timingSafeEqual exige. */
function isAuthorized(header: string | null, secret: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header.slice("Bearer ".length)), digest(secret));
}

export const GET = handle;
export const POST = handle;
