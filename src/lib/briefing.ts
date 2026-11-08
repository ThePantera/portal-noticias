import type { ArticleCardData } from "@/types/public";

/** "Lo que tenés que saber hoy": cuántas notas y de cuántas horas para atrás. */
export const BRIEFING_SIZE = 5;
export const BRIEFING_MIN = 3;
export const BRIEFING_HOURS = 24;

/**
 * Elige las notas del resumen del día entre candidatas ya ordenadas por importancia (primero
 * las destacadas, después las más nuevas): sólo de las últimas 24 horas, sin repetir, y una por
 * sección mientras alcance, para que el resumen cubra temas distintos. Con menos de tres no hay
 * resumen.
 */
export function pickBriefing(candidates: ArticleCardData[], now: Date): ArticleCardData[] {
  const since = now.getTime() - BRIEFING_HOURS * 3_600_000;
  const seen = new Set<string>();
  const fresh = candidates.filter((article) => {
    if (seen.has(article.id) || article.publishedAt.getTime() < since) return false;
    seen.add(article.id);
    return true;
  });

  const sections = new Set<string>();
  const picked: ArticleCardData[] = [];
  for (const article of fresh) {
    if (picked.length === BRIEFING_SIZE) break;
    if (sections.has(article.category.slug)) continue;
    sections.add(article.category.slug);
    picked.push(article);
  }
  // Si no hay tantas secciones, se completa con las que siguen en importancia.
  for (const article of fresh) {
    if (picked.length === BRIEFING_SIZE) break;
    if (!picked.includes(article)) picked.push(article);
  }
  const ordered = fresh.filter((article) => picked.includes(article));
  return ordered.length >= BRIEFING_MIN ? ordered : [];
}

const dayLabel = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Argentina/Buenos_Aires",
});

/** "domingo 8 de noviembre", en hora de Buenos Aires. */
export function briefingDay(now: Date): string {
  return dayLabel.format(now).replace(",", "");
}
