"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ARTICLES_TAG } from "@/lib/cache-tags";
import { requireUser } from "@/server/auth/current-user";
import { ArticleError } from "@/server/services/article-commands";
import { ImportError, importArticleFromUrl } from "@/server/services/article-import";
import type { ImportFormState } from "@/types/admin";

/** Trae una nota desde el link de otra página y abre el editor con el borrador. */
export async function importArticleAction(
  _prev: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  const user = await requireUser();
  const url = String(formData.get("url") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  if (!url) return { message: "Pegá el link de la nota." };
  if (!categoryId) return { message: "Elegí la sección." };

  let id: string;
  try {
    id = (await importArticleFromUrl(user, url, categoryId)).id;
  } catch (error) {
    if (error instanceof ImportError || error instanceof ArticleError) return { message: error.message };
    console.error("Importar nota: error inesperado", error);
    return { message: "No se pudo traer la nota. Probá de nuevo en unos segundos." };
  }
  updateTag(ARTICLES_TAG);
  redirect(`/admin/notas/${id}?guardada=importada`);
}
