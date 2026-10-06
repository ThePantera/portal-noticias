"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CategoryLink } from "@/types/public";

/** Fila de secciones. En mobile se desliza de costado; la sección activa lleva subrayado. */
export function SiteNav({ categories }: { categories: CategoryLink[] }) {
  const pathname = usePathname();
  if (categories.length === 0) return null;
  return (
    <nav aria-label="Secciones" className="border-b border-rule">
      <ul className="mx-auto flex max-w-site [scrollbar-width:none] gap-5 overflow-x-auto px-4 text-sm font-medium whitespace-nowrap md:px-8">
        {categories.map((category) => {
          const href = `/categoria/${category.slug}`;
          const active = pathname === href;
          return (
            <li key={category.slug}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-block border-b-2 py-3 ${active ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}
              >
                {category.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
