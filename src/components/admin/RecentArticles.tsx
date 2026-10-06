import Link from "next/link";
import { formatDateTime, toIsoString } from "@/lib/dates";
import type { AdminArticleRow } from "@/types/admin";
import { StatusBadge } from "./StatusBadge";

/** Últimas notas editadas. En mobile cada fila se apila; en desktop es una tabla. */
export function RecentArticles({ articles }: { articles: AdminArticleRow[] }) {
  if (articles.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-rule p-8 text-center">
        <p className="font-display text-xl">Todavía no hay notas</p>
        <p className="mt-2 text-sm text-ink-muted">Creá la primera y aparece acá.</p>
        <Link
          href="/admin/notas/nueva"
          className="mt-6 inline-block rounded-sm bg-ink px-4 py-2 text-sm font-semibold text-paper"
        >
          Crear la primera nota
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule">
      {articles.map((article) => (
        <li key={article.id} className="bg-surface p-4">
          {/* En mobile el estado va debajo del título; desde sm es una columna fija a la
              derecha, para que un título largo no desacomode la fila. */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <Link
              href={`/admin/notas/${article.id}`}
              className="font-display text-lg leading-snug font-semibold hover:underline sm:min-w-0 sm:flex-1"
            >
              {article.title}
            </Link>
            <span className="sm:shrink-0">
              <StatusBadge status={article.status} />
            </span>
          </div>
          <p className="mt-1 flex flex-wrap gap-x-2 text-sm text-ink-subtle">
            <span>{article.categoryName}</span>
            <span aria-hidden>·</span>
            <span>{article.authorName}</span>
            <span aria-hidden>·</span>
            <ArticleDate article={article} />
          </p>
        </li>
      ))}
    </ul>
  );
}

function ArticleDate({ article }: { article: AdminArticleRow }) {
  if (article.status === "SCHEDULED" && article.scheduledAt) {
    return (
      <time dateTime={toIsoString(article.scheduledAt)}>Sale el {formatDateTime(article.scheduledAt)}</time>
    );
  }
  if (article.publishedAt) {
    return (
      <time dateTime={toIsoString(article.publishedAt)}>Publicada {formatDateTime(article.publishedAt)}</time>
    );
  }
  return <time dateTime={toIsoString(article.updatedAt)}>Editada {formatDateTime(article.updatedAt)}</time>;
}
