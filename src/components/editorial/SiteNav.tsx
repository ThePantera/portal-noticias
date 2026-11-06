"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CategoryLink } from "@/types/public";

/** Fila de secciones en mayúsculas. En mobile se desliza de costado; la activa va subrayada en rojo. */
export function SiteNav({ categories }: { categories: CategoryLink[] }) {
  const pathname = usePathname();
  if (categories.length === 0) return null;
  const links = [
    { name: "Portada", href: "/" },
    { name: "Mercados", href: "/mercados" },
  ].concat(categories.map((category) => ({ name: category.name, href: `/categoria/${category.slug}` })));
  return (
    <nav aria-label="Secciones">
      <ul className="mx-auto flex max-w-site [scrollbar-width:none] gap-1 overflow-x-auto px-4 text-sm font-bold tracking-wide whitespace-nowrap uppercase md:px-8">
        {links.map(({ name, href }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-block border-b-[3px] px-2.5 py-2.5 transition-colors ${active ? "border-accent text-ink" : "border-transparent text-ink-muted hover:border-rule hover:text-ink"}`}
              >
                {name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
