import { describe, expect, it } from "vitest";
import { briefingDay, pickBriefing } from "@/lib/briefing";
import type { ArticleCardData } from "@/types/public";

const now = new Date("2026-11-08T12:00:00Z");

function article(id: string, section: string, hoursAgo: number): ArticleCardData {
  return {
    id,
    slug: id,
    title: `Nota ${id}`,
    excerpt: "",
    publishedAt: new Date(now.getTime() - hoursAgo * 3_600_000),
    readingTimeMinutes: 2,
    category: { name: section, slug: section },
    authorName: "Redacción",
    image: null,
  };
}

describe("lo que tenés que saber hoy", () => {
  it("prefiere secciones distintas y respeta el orden de importancia", () => {
    const picked = pickBriefing(
      [
        article("a", "politica", 1),
        article("b", "politica", 2),
        article("c", "deportes", 3),
        article("d", "economia", 4),
        article("e", "mundo", 5),
        article("f", "sociedad", 6),
        article("g", "cultura", 7),
      ],
      now,
    );
    expect(picked.map((a) => a.id)).toEqual(["a", "c", "d", "e", "f"]);
  });

  it("completa con la misma sección si no hay más, sin repetir notas", () => {
    const lead = article("a", "politica", 1);
    const picked = pickBriefing([lead, lead, article("b", "politica", 2), article("c", "politica", 3)], now);
    expect(picked.map((a) => a.id)).toEqual(["a", "b", "c"]);
  });

  it("deja afuera lo de más de 24 horas y no muestra nada con menos de tres", () => {
    const picked = pickBriefing([article("a", "x", 1), article("b", "y", 2), article("c", "z", 30)], now);
    expect(picked).toEqual([]);
  });

  it("nombra el día en hora de Buenos Aires", () => {
    expect(briefingDay(new Date("2026-11-09T02:00:00Z"))).toBe("domingo 8 de noviembre");
  });
});
