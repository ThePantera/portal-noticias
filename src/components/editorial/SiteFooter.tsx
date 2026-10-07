import Link from "next/link";
import type { CategoryLink } from "@/types/public";

type SiteFooterProps = { siteName: string; categories: CategoryLink[] };

export function SiteFooter({ siteName, categories }: SiteFooterProps) {
  return (
    <footer className="mt-auto bg-night text-on-night-muted">
      <div className="mx-auto grid max-w-site gap-8 px-4 py-10 text-sm md:grid-cols-[1fr_2fr] md:px-8">
        <div>
          <p className="font-display text-xl font-extrabold tracking-tight text-on-night">{siteName}</p>
          <p className="mt-2 max-w-xs">
            Noticias de tecnología para la comunidad IT: IA, código, ciberseguridad, hardware, gaming y
            laburo.
          </p>
        </div>
        {categories.length > 0 ? (
          <nav aria-label="Secciones del pie">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link href={`/categoria/${category.slug}`} className="hover:text-on-night">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </footer>
  );
}
