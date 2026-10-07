"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CategoryLink } from "@/types/public";

/** Fila de secciones en píldoras. En mobile se desliza de costado; la activa va rellena. */
export function SiteNav({ categories }: { categories: CategoryLink[] }) {
  const pathname = usePathname();
  if (categories.length === 0) return null;
  const links = [
    { name: "Portada", href: "/" },
    { name: "Mercados", href: "/mercados" },
  ].concat(categories.map((category) => ({ name: category.name, href: `/categoria/${category.slug}` })));
  return (
    <nav aria-label="Secciones">
      <ul className="mx-auto flex max-w-site [scrollbar-width:none] gap-1.5 overflow-x-auto px-4 pb-2.5 text-sm font-semibold whitespace-nowrap md:px-8">
        {links.map(({ name, href }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-block rounded-full px-3 py-1.5 transition-colors ${active ? "bg-ink text-paper" : "text-ink-muted hover:bg-surface-muted hover:text-ink"}`}
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
