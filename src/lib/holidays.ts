/**
 * Feriados nacionales. Los datos salen de ArgentinaDatos (api.argentinadatos.com), que
 * publica el calendario oficial; acá sólo se leen y se ordenan.
 */

export type HolidayKind = "inamovible" | "trasladable" | "puente";

export type Holiday = { date: string; name: string; kind: HolidayKind };

const KINDS: Record<string, HolidayKind> = {
  inamovible: "inamovible",
  trasladable: "trasladable",
  puente: "puente",
};

export const HOLIDAY_KIND_LABEL: Record<HolidayKind, string> = {
  inamovible: "Inamovible",
  trasladable: "Trasladable",
  puente: "Día no laborable con fines turísticos",
};

/** Lee /v1/feriados/{año}: `[{ fecha: "2026-01-01", tipo, nombre }]`. null si no tiene esa forma. */
export function parseHolidays(json: unknown): Holiday[] | null {
  if (!Array.isArray(json)) return null;
  const holidays: Holiday[] = [];
  for (const item of json) {
    if (!item || typeof item !== "object") continue;
    const { fecha, tipo, nombre } = item as Record<string, unknown>;
    if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;
    if (typeof nombre !== "string" || !nombre.trim()) continue;
    holidays.push({ date: fecha, name: nombre.trim(), kind: KINDS[String(tipo)] ?? "inamovible" });
  }
  if (holidays.length === 0) return null;
  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

/** El primer feriado desde `today` ("2026-11-07"), incluido el de hoy. */
export function nextHoliday(holidays: Holiday[], today: string): Holiday | null {
  return holidays.find((holiday) => holiday.date >= today) ?? null;
}

/** Días enteros entre dos fechas "AAAA-MM-DD" (0 si es hoy). */
export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

const longDate = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** "viernes, 25 de diciembre". La fecha no tiene hora: se formatea en UTC para no correrla de día. */
export function formatHolidayDate(date: string): string {
  return longDate.format(new Date(`${date}T00:00:00Z`));
}
