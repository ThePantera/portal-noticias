import { connection } from "next/server";
import {
  NO_STORE,
  errorResponse,
  readJson,
  refreshArticle,
  rejectUnauthorized,
} from "@/server/assistant-api";
import {
  deleteAssistantArticle,
  getAssistantArticle,
  updateAssistantArticle,
} from "@/server/services/assistant-articles";

/**
 * Una nota, para el asistente de redacción (ADR 0008). GET: la nota completa.
 * PATCH: corrige los campos que vengan y aplica `action`. DELETE: la elimina (si está
 * publicada o programada, la archiva antes).
 */

type Context = RouteContext<"/api/assistant/articles/[id]">;

export async function GET(request: Request, { params }: Context) {
  await connection();
  const denied = rejectUnauthorized(request);
  if (denied) return denied;
  try {
    const article = await getAssistantArticle((await params).id);
    if (!article) return Response.json({ error: "La nota no existe." }, { status: 404, headers: NO_STORE });
    return Response.json({ article }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error, "falló la lectura");
  }
}

export async function PATCH(request: Request, { params }: Context) {
  await connection();
  const denied = rejectUnauthorized(request);
  if (denied) return denied;
  const read = await readJson(request);
  if ("response" in read) return read.response;
  const { id } = await params;
  try {
    const article = await updateAssistantArticle(id, read.body);
    refreshArticle(id);
    return Response.json({ article }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error, "falló la corrección");
  }
}

export async function DELETE(request: Request, { params }: Context) {
  await connection();
  const denied = rejectUnauthorized(request);
  if (denied) return denied;
  const { id } = await params;
  try {
    const article = await deleteAssistantArticle(id);
    refreshArticle(id);
    return Response.json({ deleted: article }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error, "falló la eliminación");
  }
}
