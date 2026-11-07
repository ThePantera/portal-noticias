import Link from "next/link";
import type { CategoryLink } from "@/types/public";

const INSTITUTIONAL = [
  { name: "Quiénes somos", href: "/quienes-somos" },
  { name: "Cómo hacemos las notas", href: "/quienes-somos#como-trabajamos" },
  { name: "Contacto", href: "/contacto" },
  { name: "Privacidad", href: "/privacidad" },
];

type SiteFooterProps = { siteName: string; categories: CategoryLink[] };

export function SiteFooter({ siteName, categories }: SiteFooterProps) {
  return (
    <footer className="mt-auto bg-night text-on-night-muted">
      <div className="mx-auto grid max-w-site gap-8 px-4 py-10 text-sm md:grid-cols-[1fr_2fr] md:px-8">
        <div>
          <p className="font-display text-xl font-extrabold tracking-tight text-on-night">{siteName}</p>
          <p className="mt-2 max-w-xs">
            Noticias de la Argentina y el mundo, al instante. Se leen sin registrarse.
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
              <li>
                <Link href="/mercados" className="hover:text-on-night">
                  Mercados
                </Link>
              </li>
              <li>
                <Link href="/vuelos" className="hover:text-on-night">
                  Vuelos en vivo
                </Link>
              </li>
              <li>
                <Link href="/en-vivo" className="hover:text-on-night">
                  Cámaras en vivo
                </Link>
              </li>
              <li>
                <Link href="/feriados" className="hover:text-on-night">
                  Feriados
                </Link>
              </li>
            </ul>
          </nav>
        ) : null}
      </div>
      <nav aria-label="El diario" className="border-t border-night-raised">
        <ul className="mx-auto flex max-w-site flex-wrap gap-x-6 gap-y-2 px-4 py-4 text-sm md:px-8">
          {INSTITUTIONAL.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-on-night">
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
