"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CategoryLink } from "@/types/public";

/** Fila de secciones en serif, mayúsculas y separadas por filetes. En mobile se desliza de costado; la activa va en amarillo. */
export function SiteNav({ categories }: { categories: CategoryLink[] }) {
  const pathname = usePathname();
  if (categories.length === 0) return null;
  const links = [
    { name: "Portada", href: "/" },
    { name: "Mercados", href: "/mercados" },
  ].concat(categories.map((category) => ({ name: category.name, href: `/categoria/${category.slug}` })));
  return (
    <nav aria-label="Secciones" className="border-t border-rule">
      <ul className="mx-auto flex max-w-site [scrollbar-width:none] divide-x divide-rule overflow-x-auto px-4 py-1.5 font-display text-sm tracking-widest whitespace-nowrap uppercase md:px-8 lg:justify-center">
        {links.map(({ name, href }) => {
          const active = pathname === href;
          return (
            <li key={href}>
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
    </nav>
  );
}
