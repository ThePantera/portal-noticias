import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RecentArticles } from "@/components/admin/RecentArticles";
import { ARTICLE_STATUS, STATUS_ORDER } from "@/lib/article-status";
import { requirePermission } from "@/server/auth/current-user";
import { countArticlesByStatus, listArticles } from "@/server/services/articles";
import { ARTICLE_STATUSES, type ArticleStatus } from "@/types/article";

export const metadata: Metadata = { title: "Notas" };

function parseStatus(value: unknown): ArticleStatus | undefined {
  const upper = typeof value === "string" ? value.toUpperCase() : "";
  return (ARTICLE_STATUSES as readonly string[]).includes(upper) ? (upper as ArticleStatus) : undefined;
}

function hrefFor(params: { estado?: ArticleStatus; q?: string; pagina?: number }) {
  const search = new URLSearchParams();
  if (params.estado) search.set("estado", params.estado.toLowerCase());
  if (params.q) search.set("q", params.q);
  if (params.pagina && params.pagina > 1) search.set("pagina", String(params.pagina));
  const query = search.toString();
  return query ? `/admin/notas?${query}` : "/admin/notas";
}

async function ArticleList({ searchParams }: { searchParams: PageProps<"/admin/notas">["searchParams"] }) {
  await requirePermission("dashboard:view");
  const params = await searchParams;
  const status = parseStatus(params.estado);
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const page = Number(params.pagina) || 1;
  const deleted = params.eliminada === "1";

  const [counts, list] = await Promise.all([countArticlesByStatus(), listArticles({ status, q, page })]);
  const filtered = Boolean(status || q);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Notas</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">
            {status ? ARTICLE_STATUS[status].plural : "Todas las notas"}
          </h1>
        </div>
        <Link
          href="/admin/notas/nueva"
          className="rounded-sm bg-ink px-4 py-2.5 text-sm font-semibold text-paper"
        >
          Escribir una nota
        </Link>
      </div>

      {deleted ? (
        <p role="status" className="rounded-md border border-success px-4 py-3 text-sm text-success">
          La nota se eliminó.
        </p>
      ) : null}

      <div className="grid gap-4 border-b border-rule pb-4 lg:flex lg:items-center lg:justify-between">
        <nav aria-label="Filtrar por estado" className="-mx-4 min-w-0 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <ul className="flex gap-1 text-sm whitespace-nowrap">
            <FilterTab href={hrefFor({ q })} active={!status} label="Todas" count={counts.total} />
            {STATUS_ORDER.map((s) => (
              <FilterTab
                key={s}
                href={hrefFor({ estado: s, q })}
                active={status === s}
                label={ARTICLE_STATUS[s].plural}
                count={counts[s]}
              />
            ))}
          </ul>
        </nav>
        <form role="search" action="/admin/notas" className="flex gap-2">
          {status ? <input type="hidden" name="estado" value={status.toLowerCase()} /> : null}
          <label htmlFor="q" className="sr-only">
            Buscar por título
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Buscar por título"
            className="min-w-0 flex-1 rounded-md border border-rule bg-surface px-3 py-2 text-sm lg:w-64 lg:flex-none"
          />
          <button
            type="submit"
            className="rounded-md border border-rule px-3 py-2 text-sm font-semibold hover:bg-surface"
          >
            Buscar
          </button>
        </form>
      </div>

      {list.rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-rule p-8 text-center">
          <p className="font-display text-xl">
            {filtered ? "No hay notas que coincidan" : "Todavía no hay notas"}
          </p>
          {filtered ? (
            <Link href="/admin/notas" className="mt-4 inline-block text-sm text-accent underline">
              Ver todas las notas
            </Link>
          ) : (
            <Link
              href="/admin/notas/nueva"
              className="mt-6 inline-block rounded-sm bg-ink px-4 py-2 text-sm font-semibold text-paper"
            >
              Crear la primera nota
            </Link>
          )}
        </div>
      ) : (
        <>
          <RecentArticles articles={list.rows} />
          <Pagination
            page={list.page}
            pageCount={list.pageCount}
            total={list.total}
            href={(pagina) => hrefFor({ estado: status, q, pagina })}
          />
        </>
      )}
    </div>
  );
}

function FilterTab({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 ${
          active ? "bg-ink font-semibold text-paper" : "text-ink-muted hover:bg-surface hover:text-ink"
        }`}
      >
        {label}
        <span className="tabular-nums opacity-75">{count}</span>
      </Link>
    </li>
  );
}

function Pagination({
  page,
  pageCount,
  total,
  href,
}: {
  page: number;
  pageCount: number;
  total: number;
  href: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Páginas" className="flex items-center justify-between gap-4 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="text-accent underline">
          ← Anteriores
        </Link>
      ) : (
        <span />
      )}
      <span className="text-ink-subtle">
        Página {page} de {pageCount} · {total} notas
      </span>
      {page < pageCount ? (
        <Link href={href(page + 1)} className="text-accent underline">
          Siguientes →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export default function ArticlesPage({ searchParams }: PageProps<"/admin/notas">) {
  return (
    <Suspense fallback={<p className="text-sm text-ink-subtle">Cargando notas…</p>}>
      <ArticleList searchParams={searchParams} />
    </Suspense>
  );
}
