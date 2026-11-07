/**
 * Medición propia de lecturas: cuántas veces se abrió cada nota por día. No usa cookies ni
 * guarda quién leyó; sólo suma uno al contador del día.
 */

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

/** Día de Buenos Aires como "2026-11-07": el diario cuenta los días con la hora argentina. */
export function buenosAiresDay(value: Date): string {
  return dayFormat.format(value);
}

/** Días que cuenta "Lo más leído" del sitio público: hoy y los dos anteriores. */
export const MOST_READ_DAYS = 3;

/** Primer día (hora de Buenos Aires) de una ventana de `days` días que termina hoy. */
export function viewsWindowStart(now: Date, days: number): string {
  return buenosAiresDay(new Date(now.getTime() - (days - 1) * 86_400_000));
}

/** Buscadores, vistas previas de redes y herramientas automáticas: no son lectores. */
const BOT_PATTERN =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|curl|wget|python|axios|node-fetch/i;

export function isLikelyBot(userAgent: string | null): boolean {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

/** Identificador de nota (cuid): evita escribir en la base con cualquier cosa que llegue. */
export function isArticleId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9]{20,40}$/.test(value);
}
