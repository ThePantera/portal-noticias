import type { Metadata } from "next";
import { Suspense } from "react";
import { ArticleList } from "@/components/editorial/ArticleList";
import { EmptyState } from "@/components/editorial/EmptyState";
import { Pagination } from "@/components/editorial/Pagination";
import { pageParam, textParam } from "@/lib/search-params";
import { searchArticles } from "@/server/services/public-content";

export const metadata: Metadata = { title: "Buscar", robots: { index: false, follow: true } };

async function Results({ searchParams }: PageProps<"/buscar">) {
  const search = await searchParams;
  const q = textParam(search.q);
  const result = await searchArticles(q, pageParam(search.pagina));

  return (
    <>
      <form action="/buscar" role="search" className="flex max-w-xl gap-2">
        <label htmlFor="search-page-q" className="sr-only">
          Qué querés buscar
        </label>
        <input
          id="search-page-q"
          name="q"
          type="search"
          defaultValue={result.query}
          maxLength={200}
          placeholder="Buscar noticias"
          className="min-w-0 flex-1 rounded-md border border-rule bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-subtle"
        />
        <button type="submit" className="rounded-sm bg-ink px-4 py-2 text-sm font-semibold text-paper">
          Buscar
        </button>
      </form>

      {!result.query ? (
        <EmptyState title="Escribí qué querés buscar">
          Busca en títulos, bajadas y cuerpo de las notas, con o sin tildes.
        </EmptyState>
      ) : result.total === 0 ? (
        <EmptyState title={`No encontramos notas sobre “${result.query}”`}>
          Probá con otras palabras o con menos términos.
        </EmptyState>
      ) : (
        <>
          <p role="status" className="text-sm text-ink-subtle">
            {result.total === 1 ? "1 resultado" : `${result.total} resultados`} para “{result.query}”
          </p>
          <ArticleList articles={result.articles} />
          <Pagination
            basePath="/buscar"
            page={result.page}
            pageCount={result.pageCount}
            params={{ q: result.query }}
          />
        </>
      )}
    </>
  );
}

export default function SearchPage(props: PageProps<"/buscar">) {
  return (
    <div className="mx-auto grid max-w-site gap-8 px-4 py-8 md:px-8 md:py-10">
      <h1 className="font-display text-3xl font-semibold md:text-4xl">Buscar</h1>
      <Suspense fallback={<p className="text-sm text-ink-subtle">Buscando…</p>}>
        <Results {...props} />
      </Suspense>
    </div>
  );
}
