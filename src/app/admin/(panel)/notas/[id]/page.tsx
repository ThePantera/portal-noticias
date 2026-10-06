import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleEditor } from "@/components/admin/ArticleEditor";
import { requirePermission, requireUser } from "@/server/auth/current-user";
import { MAX_FEATURED_RANK } from "@/server/services/article-commands";
import { getArticleForEdit, listCategoryOptions } from "@/server/services/articles";
import { deleteArticleAction, saveArticleAction, uploadImageAction } from "../actions";

export const metadata: Metadata = { title: "Editar nota" };

const MISSING: Record<string, string> = {
  excerpt: "la bajada",
  content: "el cuerpo",
  scheduledAt: "una fecha y hora futuras",
  mainImageAlt: "la descripción de la imagen",
};

/** "la bajada y el cuerpo" a partir de "excerpt,content". */
function missingList(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const items = value
    .split(",")
    .map((key) => MISSING[key])
    .filter(Boolean);
  if (items.length === 0) return null;
  return items.length === 1 ? items[0] : `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}

const NOTICES: Record<string, string> = {
  save: "Nota creada como borrador.",
  borrador:
    "La nota se guardó como borrador, pero no se pudo cambiar su estado. Revisá los datos y probá de nuevo.",
  publish: "Nota creada y publicada.",
  schedule: "Nota creada y programada.",
  eliminar: "No se pudo eliminar: sólo se eliminan borradores y notas archivadas.",
};

async function EditArticle({ params, searchParams }: PageProps<"/admin/notas/[id]">) {
  await requireUser();
  const { id } = await params;
  const article = await getArticleForEdit(id);
  if (!article) notFound();
  await requirePermission("article:edit", { ownerId: article.authorId });

  const query = await searchParams;
  const noticeKey =
    typeof query.error === "string" ? query.error : typeof query.guardada === "string" ? query.guardada : "";
  const missing = noticeKey === "borrador" ? missingList(query.falta) : null;
  const notice = missing
    ? `La nota se guardó como borrador. Para publicarla falta ${missing}.`
    : NOTICES[noticeKey];
  const categories = await listCategoryOptions();

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/notas" className="text-sm text-ink-muted hover:text-ink">
          ← Notas
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold">Editar nota</h1>
      </div>
      <ArticleEditor
        // Una nota distinta es un editor nuevo, con su propio estado.
        key={article.id}
        article={article}
        categories={categories}
        saveAction={saveArticleAction}
        deleteAction={deleteArticleAction}
        uploadAction={uploadImageAction}
        notice={notice}
        maxFeaturedRank={MAX_FEATURED_RANK}
      />
    </div>
  );
}

export default function EditArticlePage(props: PageProps<"/admin/notas/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-ink-subtle">Abriendo la nota…</p>}>
      <EditArticle {...props} />
    </Suspense>
  );
}
