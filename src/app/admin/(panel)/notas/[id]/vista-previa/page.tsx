import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ArticleBody } from "@/components/editorial/ArticleBody";
import { ArticleFigure } from "@/components/editorial/ArticleImage";
import { formatDate, toIsoString } from "@/lib/dates";
import { requirePermission, requireUser } from "@/server/auth/current-user";
import { getArticleForEdit } from "@/server/services/articles";

export const metadata: Metadata = { title: "Vista previa" };

/** Lo último guardado, con la tipografía del portal, aunque la nota no esté publicada. */
async function Preview({ params }: PageProps<"/admin/notas/[id]/vista-previa">) {
  await requireUser();
  const { id } = await params;
  const article = await getArticleForEdit(id);
  if (!article) notFound();
  await requirePermission("article:edit", { ownerId: article.authorId });
  const date = article.publishedAt ?? article.scheduledAt ?? article.updatedAt;

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-surface px-4 py-3 text-sm">
        <span className="flex items-center gap-3">
          Vista previa <StatusBadge status={article.status} />
        </span>
        <Link href={`/admin/notas/${article.id}`} className="font-semibold text-accent underline">
          Volver al editor
        </Link>
      </div>
      <article className="mx-auto w-full max-w-measure">
        <p className="kicker">{article.categoryName}</p>
        <h1 className="mt-3 font-display text-3xl leading-tight font-semibold md:text-5xl">
          {article.title}
        </h1>
        {article.excerpt ? (
          <p className="mt-4 font-body text-xl leading-snug text-ink-muted">{article.excerpt}</p>
        ) : null}
        <p className="mt-6 border-y border-rule py-3 text-sm text-ink-subtle">
          Por <span className="font-semibold text-ink">{article.authorName}</span> ·{" "}
          <time dateTime={toIsoString(date)}>{formatDate(date)}</time> · {article.readingTimeMinutes} min de
          lectura
        </p>
        {article.mainImage ? (
          <ArticleFigure image={article.mainImage} sizes="(min-width: 768px) 40rem, 100vw" className="mt-8" />
        ) : null}
        <ArticleBody content={article.content} className="mt-8" />
        {article.tags.length > 0 ? (
          <ul className="mt-10 flex flex-wrap gap-2 border-t border-rule pt-6 text-sm">
            {article.tags.map((tag) => (
              <li key={tag} className="rounded-sm border border-rule px-2 py-1 text-ink-muted">
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </article>
    </div>
  );
}

export default function PreviewPage(props: PageProps<"/admin/notas/[id]/vista-previa">) {
  return (
    <Suspense fallback={<p className="text-sm text-ink-subtle">Cargando la vista previa…</p>}>
      <Preview {...props} />
    </Suspense>
  );
}
