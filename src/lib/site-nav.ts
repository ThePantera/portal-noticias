import type { CategoryLink } from "@/types/public";

export type NavLink = { name: string; href: string };

/** Orden de las secciones de noticias en el menú. Una sección nueva va al final, en el orden de la base. */
const SECTION_ORDER = [
  "politica",
  "economia",
  "sociedad",
  "mundo",
  "seguridad",
  "deportes",
  "tecnologia",
  "cultura",
  "ciencia",
  "tendencias",
];

/** Servicios que también van en la fila de secciones, después de las noticias. */
const ROW_SERVICES: NavLink[] = [
  { name: "Mercados", href: "/mercados" },
  { name: "Vuelos", href: "/vuelos" },
  { name: "Feriados", href: "/feriados" },
];

/** Servicios que sólo entran en el panel "Secciones" (no hay lugar en la fila). */
const PANEL_ONLY_SERVICES: NavLink[] = [
  { name: "Horóscopo", href: "/horoscopo" },
  { name: "Clima", href: "/clima" },
];

function rank(slug: string): number {
  const index = SECTION_ORDER.indexOf(slug);
  return index === -1 ? SECTION_ORDER.length : index;
}

/** Secciones de noticias en el orden editorial; las desconocidas conservan el orden recibido. */
export function sortSections(categories: CategoryLink[]): NavLink[] {
  return categories
    .map((category, position) => ({ category, position }))
    .sort((a, b) => rank(a.category.slug) - rank(b.category.slug) || a.position - b.position)
    .map(({ category }) => ({ name: category.name, href: `/categoria/${category.slug}` }));
}

/**
 * Enlaces del menú público: la fila (noticias y después Mercados, Vuelos y Feriados) y el panel
 * completo, que suma la portada y los servicios que no entran en la fila.
 */
export function buildSiteNav(categories: CategoryLink[]): {
  row: NavLink[];
  sections: NavLink[];
  services: NavLink[];
} {
  const news = sortSections(categories);
  return {
    row: [...news, ...ROW_SERVICES],
    sections: [{ name: "Portada", href: "/" }, ...news],
    services: [...ROW_SERVICES, ...PANEL_ONLY_SERVICES],
  };
}
