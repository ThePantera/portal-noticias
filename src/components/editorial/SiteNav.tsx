"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buildSiteNav, type NavLink } from "@/lib/site-nav";
import type { CategoryLink } from "@/types/public";

const PANEL_ID = "site-nav-panel";

/**
 * Fila de secciones en serif, mayúsculas y separadas por filetes: primero las noticias y después
 * Mercados, Vuelos y Feriados. Si entran todas quedan centradas; si no, se desliza de costado y un
 * degradado en el borde derecho avisa que hay más. El botón "Secciones" abre un panel con todas las
 * secciones y los servicios (cierra con Escape, con el mismo botón o al navegar). La activa va en
 * amarillo.
 */
export function SiteNav({ categories }: { categories: CategoryLink[] }) {
  const pathname = usePathname();
  // El panel queda abierto sólo en la página donde se abrió: al navegar se cierra solo.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const [hasMore, setHasMore] = useState(false);
  const rowRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Muestra el degradado mientras quede fila escondida a la derecha.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const update = () => setHasMore(row.scrollLeft + row.clientWidth < row.scrollWidth - 1);
    const observer = new ResizeObserver(update);
    observer.observe(row);
    row.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      row.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenAt(null);
      buttonRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (categories.length === 0) return null;
  const { row, sections, services } = buildSiteNav(categories);
  const close = () => setOpenAt(null);

  return (
    <nav aria-label="Secciones" className="relative border-t border-rule">
      <div className="mx-auto flex max-w-site items-stretch">
        <div className="relative min-w-0 flex-1">
          <ul
            ref={rowRef}
            className="flex [scrollbar-width:none] divide-x divide-rule overflow-x-auto px-4 py-1.5 font-display text-sm tracking-widest whitespace-nowrap uppercase md:px-8"
          >
            {row.map(({ name, href }) => {
              const active = pathname === href;
              return (
                <li key={href} className="first:ms-auto last:me-auto">
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-block px-3 py-1 transition-colors ${active ? "bg-signal font-bold text-on-signal" : "text-ink hover:underline"}`}
                  >
                    {name}
                  </Link>
                </li>
              );
            })}
          </ul>
          {/* Degradado al color del papel: indica que la fila sigue y se puede deslizar. */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-paper to-transparent transition-opacity ${hasMore ? "opacity-100" : "opacity-0"}`}
          />
        </div>
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls={PANEL_ID}
          onClick={() => setOpenAt(open ? null : pathname)}
          className={`shrink-0 border-l border-rule px-3 py-1.5 font-display text-sm font-bold tracking-widest whitespace-nowrap uppercase transition-colors md:px-5 ${open ? "bg-ink text-paper" : "text-ink hover:bg-surface-muted"}`}
        >
          <span aria-hidden="true">☰ </span>Secciones
        </button>
      </div>
      <div
        id={PANEL_ID}
        hidden={!open}
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-8rem)] overflow-y-auto border-b border-rule bg-surface shadow-raised"
      >
        <div className="mx-auto grid max-w-site gap-6 px-4 py-5 md:grid-cols-[2fr_1fr] md:px-8">
          <NavGroup
            title="Secciones"
            links={sections}
            pathname={pathname}
            onNavigate={close}
            columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          />
          <NavGroup
            title="Servicios"
            links={services}
            pathname={pathname}
            onNavigate={close}
            columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-2"
          />
        </div>
      </div>
    </nav>
  );
}

type NavGroupProps = {
  title: string;
  links: NavLink[];
  pathname: string;
  onNavigate: () => void;
  /** Clases de columnas de la grilla según el ancho. */
  columns: string;
};

/** Grupo del panel: título chico y los enlaces en columnas. */
function NavGroup({ title, links, pathname, onNavigate, columns }: NavGroupProps) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold tracking-widest text-ink-subtle uppercase">{title}</h2>
      <ul className={`grid gap-x-4 ${columns}`}>
        {links.map(({ name, href }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`block border-b border-rule py-2.5 font-display text-base ${active ? "font-bold text-ink underline decoration-signal decoration-4" : "text-ink hover:underline"}`}
              >
                {name}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
