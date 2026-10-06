import Link from "next/link";
import type { CategoryLink } from "@/types/public";

type SiteFooterProps = { siteName: string; categories: CategoryLink[] };

export function SiteFooter({ siteName, categories }: SiteFooterProps) {
  return (
    <footer className="mt-auto border-t border-rule">
      <div className="mx-auto grid max-w-site gap-6 px-4 py-8 text-sm text-ink-subtle md:px-8">
        {categories.length > 0 ? (
          <nav aria-label="Secciones del pie">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link href={`/categoria/${category.slug}`} className="hover:text-ink">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <p>{siteName}</p>
      </div>
    </footer>
  );
}
