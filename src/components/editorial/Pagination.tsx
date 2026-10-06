import Link from "next/link";

type PaginationProps = {
  basePath: string;
  page: number;
  pageCount: number;
  params?: Record<string, string>;
};

function hrefFor(basePath: string, page: number, params: Record<string, string>) {
  const search = new URLSearchParams(params);
  if (page > 1) search.set("pagina", String(page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** Paginado anterior / siguiente. No se muestra si hay una sola página. */
export function Pagination({ basePath, page, pageCount, params = {} }: PaginationProps) {
  if (pageCount <= 1) return null;
  const link = "rounded-sm border border-rule px-4 py-2 font-medium hover:border-ink";
  return (
    <nav aria-label="Paginado" className="flex items-center justify-between gap-4 text-sm">
      {page > 1 ? (
        <Link href={hrefFor(basePath, page - 1, params)} rel="prev" className={link}>
          Anteriores
        </Link>
      ) : (
        <span />
      )}
      <span className="text-ink-subtle">
        Página {page} de {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={hrefFor(basePath, page + 1, params)} rel="next" className={link}>
          Siguientes
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
