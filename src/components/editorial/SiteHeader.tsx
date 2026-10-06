import Link from "next/link";
import type { CategoryLink } from "@/types/public";
import { SiteNav } from "./SiteNav";

type SiteHeaderProps = { siteName: string; categories: CategoryLink[] };

/** Cabecera pública: nombre del portal, búsqueda y la fila de secciones (salen de la base). */
export function SiteHeader({ siteName, categories }: SiteHeaderProps) {
  return (
    <header>
      <div className="mx-auto flex max-w-site items-center justify-between gap-4 px-4 py-4 md:px-8">
        <Link
          href="/"
          className="font-display text-2xl leading-none font-bold tracking-tight whitespace-nowrap md:text-4xl"
        >
          {siteName}
        </Link>
        <form action="/buscar" role="search" className="flex min-w-0 flex-1 justify-end">
          <label htmlFor="site-search" className="sr-only">
            Buscar noticias
          </label>
          <input
            id="site-search"
            name="q"
            type="search"
            placeholder="Buscar"
            className="w-full max-w-56 min-w-0 rounded border border-rule bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-subtle"
          />
        </form>
      </div>
      <div className="border-t border-rule">
        <SiteNav categories={categories} />
      </div>
    </header>
  );
}
