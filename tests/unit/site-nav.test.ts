import { describe, expect, it } from "vitest";
import { buildSiteNav, sortSections } from "@/lib/site-nav";

const categories = [
  { name: "Tendencias", slug: "tendencias" },
  { name: "Gaming", slug: "gaming" },
  { name: "Política", slug: "politica" },
  { name: "IA", slug: "ia" },
  { name: "Economía", slug: "economia" },
];

describe("menú de secciones", () => {
  it("ordena las secciones de noticias y deja las nuevas al final, en el orden recibido", () => {
    expect(sortSections(categories).map((link) => link.name)).toEqual([
      "Política",
      "Economía",
      "Tendencias",
      "Gaming",
      "IA",
    ]);
  });

  it("la fila pone las noticias primero y después Mercados, Vuelos y Feriados", () => {
    const { row } = buildSiteNav(categories);
    expect(row.map((link) => link.href)).toEqual([
      "/categoria/politica",
      "/categoria/economia",
      "/categoria/tendencias",
      "/categoria/gaming",
      "/categoria/ia",
      "/mercados",
      "/vuelos",
      "/feriados",
    ]);
    expect(row.some((link) => link.href === "/")).toBe(false);
  });

  it("el panel suma la portada y todos los servicios", () => {
    const { sections, services } = buildSiteNav(categories);
    expect(sections[0]).toEqual({ name: "Portada", href: "/" });
    expect(sections).toHaveLength(categories.length + 1);
    expect(services.map((link) => link.href)).toEqual([
      "/mercados",
      "/vuelos",
      "/feriados",
      "/quiniela",
      "/horoscopo",
      "/clima",
    ]);
  });
});
