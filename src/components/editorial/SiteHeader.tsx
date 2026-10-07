import Link from "next/link";
import type { DollarRates } from "@/types/exchange";
import type { CategoryLink } from "@/types/public";
import { DollarTicker } from "./DollarTicker";
import { SiteNav } from "./SiteNav";

type SiteHeaderProps = { siteName: string; categories: CategoryLink[]; rates: DollarRates | null };

/**
 * Cabecera pública: barra del dólar, marca, búsqueda y la fila de secciones (salen de la
 * base). La marca, la búsqueda y las secciones quedan fijas arriba al bajar.
 */
export function SiteHeader({ siteName, categories, rates }: SiteHeaderProps) {
  return (
    <>
      <DollarTicker initial={rates} />
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-site items-center justify-between gap-4 px-4 pt-3 pb-2 md:px-8 md:pt-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent font-display text-lg font-extrabold text-surface md:size-10"
            >
              {siteName.charAt(0).toUpperCase()}
            </span>
            <span className="truncate font-display text-xl font-extrabold tracking-tight md:text-2xl">
              {siteName}
            </span>
          </Link>
          <form action="/buscar" role="search" className="flex min-w-0 flex-1 justify-end">
            <div className="relative w-full max-w-72 min-w-0">
              <label htmlFor="site-search" className="sr-only">
                Buscar noticias
              </label>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle"
              >
                <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="m13 13 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                id="site-search"
                name="q"
                type="search"
                placeholder="Buscar noticias"
                className="w-full rounded-full border border-rule bg-surface py-2 pr-4 pl-9 text-base text-ink shadow-card placeholder:text-ink-subtle"
              />
            </div>
          </form>
        </div>
        <SiteNav categories={categories} />
      </header>
    </>
  );
}
