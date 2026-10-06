import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArticleEditor } from "@/components/admin/ArticleEditor";
import { FreshOnNavigate } from "@/components/admin/FreshOnNavigate";
import { requirePermission } from "@/server/auth/current-user";
import { MAX_FEATURED_RANK } from "@/server/services/article-commands";
import { listCategoryOptions } from "@/server/services/articles";
import { deleteArticleAction, saveArticleAction, uploadImageAction } from "../actions";

export const metadata: Metadata = { title: "Nueva nota" };

async function NewArticle() {
  await requirePermission("article:create");
  const categories = await listCategoryOptions();
  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/notas" className="text-sm text-ink-muted hover:text-ink">
          ← Notas
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold">Nueva nota</h1>
      </div>
      <FreshOnNavigate>
        <ArticleEditor
          article={null}
          categories={categories}
          saveAction={saveArticleAction}
          deleteAction={deleteArticleAction}
          uploadAction={uploadImageAction}
          maxFeaturedRank={MAX_FEATURED_RANK}
        />
      </FreshOnNavigate>
    </div>
  );
}

export default function NewArticlePage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-subtle">Abriendo el editor…</p>}>
      <NewArticle />
    </Suspense>
  );
}
