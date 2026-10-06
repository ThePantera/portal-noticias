import { connection } from "next/server";
import {
  NO_STORE,
  errorResponse,
  readJson,
  refreshArticle,
  rejectUnauthorized,
} from "@/server/assistant-api";
import {
  MAX_ARTICLES_PER_DAY,
  createAssistantArticle,
  listAssistantCategories,
  listLatestArticles,
} from "@/server/services/assistant-articles";

/**
 * API del asistente de redacción (ADR 0008), con `Authorization: Bearer $ASSISTANT_API_KEY`.
 * GET: secciones y últimas notas. POST: crea una nota y, con `action`, la publica o la programa.
 */

export async function GET(request: Request) {
  await connection();
  const denied = rejectUnauthorized(request);
  if (denied) return denied;
  try {
    const [categories, articles] = await Promise.all([listAssistantCategories(), listLatestArticles()]);
    return Response.json({ categories, articles, maxPerDay: MAX_ARTICLES_PER_DAY }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error, "falló el listado");
  }
}

export async function POST(request: Request) {
  await connection();
  const denied = rejectUnauthorized(request);
  if (denied) return denied;
  const read = await readJson(request);
  if ("response" in read) return read.response;
  try {
    const article = await createAssistantArticle(read.body);
    refreshArticle(article.id);
    return Response.json({ article }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return errorResponse(error, "falló la creación");
  }
}
