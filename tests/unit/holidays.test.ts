import { describe, expect, it } from "vitest";
import { daysUntil, formatHolidayDate, nextHoliday, parseHolidays } from "@/lib/holidays";

const SAMPLE = [
  { fecha: "2026-12-25", tipo: "inamovible", nombre: "Navidad" },
  { fecha: "2026-11-23", tipo: "trasladable", nombre: "Día de la Soberanía Nacional" },
  { fecha: "2026-12-08", tipo: "inamovible", nombre: "Inmaculada Concepción de María" },
  { fecha: "mal", tipo: "inamovible", nombre: "Sin fecha" },
];

describe("feriados", () => {
  it("lee la respuesta de ArgentinaDatos, descarta lo inválido y ordena por fecha", () => {
    const holidays = parseHolidays(SAMPLE);
    expect(holidays?.map((h) => h.date)).toEqual(["2026-11-23", "2026-12-08", "2026-12-25"]);
    expect(holidays?.[0].kind).toBe("trasladable");
    expect(parseHolidays({ error: "x" })).toBeNull();
    expect(parseHolidays([])).toBeNull();
  });

  it("encuentra el próximo, incluido el de hoy, y cuenta los días", () => {
    const holidays = parseHolidays(SAMPLE) ?? [];
    expect(nextHoliday(holidays, "2026-11-07")?.name).toBe("Día de la Soberanía Nacional");
    expect(nextHoliday(holidays, "2026-12-08")?.name).toBe("Inmaculada Concepción de María");
    expect(nextHoliday(holidays, "2026-12-26")).toBeNull();
    expect(daysUntil("2026-11-23", "2026-11-07")).toBe(16);
    expect(daysUntil("2026-11-07", "2026-11-07")).toBe(0);
  });

  it("escribe la fecha sin correrla de día", () => {
    expect(formatHolidayDate("2026-12-25")).toBe("viernes, 25 de diciembre");
  });
});
