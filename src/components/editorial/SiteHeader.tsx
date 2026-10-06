import Link from "next/link";

type SiteHeaderProps = { siteName: string };

/**
 * Cabecera pública. La navegación por categorías se completa en la Fase 7,
 * cuando las categorías se lean de la base (no se hardcodean).
 */
export function SiteHeader({ siteName }: SiteHeaderProps) {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-site items-center justify-between gap-4 px-4 py-4 md:px-8">
        <Link
          href="/"
          className="font-display text-2xl leading-none font-bold tracking-tight whitespace-nowrap md:text-4xl"
        >
          {siteName}
        </Link>
        <form action="/buscar" role="search" className="min-w-0">
          <label htmlFor="site-search" className="sr-only">
            Buscar noticias
          </label>
          <input
            id="site-search"
            name="q"
            type="search"
            placeholder="Buscar noticias"
            className="w-36 min-w-0 rounded border border-rule bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle sm:w-56"
          />
        </form>
      </div>
    </header>
  );
}
