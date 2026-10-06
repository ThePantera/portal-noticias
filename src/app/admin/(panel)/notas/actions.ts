"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ARTICLES_TAG, articleTag } from "@/lib/cache-tags";
import { parseDateTimeInput } from "@/lib/dates";
import { requireUser } from "@/server/auth/current-user";
import {
  ArticleError,
  createArticle,
  deleteArticle,
  transitionArticle,
  updateArticle,
  type ArticleInput,
} from "@/server/services/article-commands";
import type { EditorFormState, EditorIntent } from "@/types/admin";

const INTENTS: readonly EditorIntent[] = ["save", "publish", "schedule", "unpublish", "archive"];

const DONE: Record<EditorIntent, string> = {
  save: "Cambios guardados.",
  publish: "Nota publicada.",
  schedule: "Nota programada.",
  unpublish: "La nota volvió a borrador.",
  archive: "Nota archivada.",
};

function readInput(formData: FormData): ArticleInput {
  const text = (name: string) => String(formData.get(name) ?? "");
  let content: unknown = null;
  try {
    content = JSON.parse(text("content") || "null");
  } catch {
    // Un JSON roto se guarda como documento vacío; sanitizeDoc se encarga.
  }
  const rank = Number(text("featuredRank"));
  return {
    title: text("title"),
    excerpt: text("excerpt"),
    content,
    categoryId: text("categoryId"),
    tags: text("tags").split(","),
    slug: text("slug"),
    seoTitle: text("seoTitle"),
    seoDescription: text("seoDescription"),
    featuredRank: Number.isInteger(rank) && rank > 0 ? rank : null,
  };
}

function toState(error: unknown, savedFirst = false): EditorFormState {
  if (error instanceof ArticleError) {
    return {
      status: "error",
      message: error.message,
      fieldErrors: error.fieldErrors,
      ...(savedFirst ? { savedAt: Date.now() } : {}),
    };
  }
  // Nunca se muestra el detalle técnico: queda en el log del servidor.
  console.error("Editor de notas: error inesperado", error);
  return { status: "error", message: "No se pudo guardar. Probá de nuevo en unos segundos." };
}

/**
 * Guarda la nota y, si el botón lo pide, cambia su estado. Primero guarda siempre:
 * así "Publicar" nunca publica una versión distinta de la que se ve en pantalla.
 */
export async function saveArticleAction(
  _prev: EditorFormState,
  formData: FormData,
): Promise<EditorFormState> {
  const user = await requireUser();
  const intent = String(formData.get("intent") ?? "save") as EditorIntent;
  if (!INTENTS.includes(intent)) return { status: "error", message: "Acción desconocida." };
  const id = String(formData.get("id") ?? "");

  let articleId: string;
  try {
    articleId = id
      ? (await updateArticle(user, id, readInput(formData))).id
      : (await createArticle(user, readInput(formData))).id;
  } catch (error) {
    return toState(error);
  }
  updateTag(ARTICLES_TAG);
  updateTag(articleTag(articleId));

  let transitionError: EditorFormState | null = null;
  if (intent !== "save") {
    try {
      const scheduledAt =
        intent === "schedule" ? parseDateTimeInput(String(formData.get("scheduledAt") ?? "")) : null;
      await transitionArticle(user, articleId, intent, { scheduledAt });
    } catch (error) {
      transitionError = toState(error, true);
    }
  }

  // Una nota nueva pasa a tener su propia dirección en el panel. Si no se pudo cambiar su
  // estado, la URL lleva qué faltó, porque el redirect pierde los errores por campo.
  if (!id) {
    const missing = Object.keys(transitionError?.fieldErrors ?? {}).join(",");
    const query = transitionError
      ? `guardada=borrador${missing ? `&falta=${missing}` : ""}`
      : `guardada=${intent}`;
    redirect(`/admin/notas/${articleId}?${query}`);
  }

  refresh();
  return transitionError ?? { status: "saved", message: DONE[intent], savedAt: Date.now() };
}

export async function deleteArticleAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  try {
    await deleteArticle(user, id);
  } catch (error) {
    if (!(error instanceof ArticleError)) console.error("Eliminar nota: error inesperado", error);
    redirect(`/admin/notas/${id}?error=eliminar`);
  }
  updateTag(ARTICLES_TAG);
  updateTag(articleTag(id));
  redirect("/admin/notas?eliminada=1");
}
