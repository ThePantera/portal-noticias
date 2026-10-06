import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, toIsoString } from "@/lib/dates";

// 6 de octubre de 2026, 14:30 UTC = 11:30 en Buenos Aires (UTC-3).
const sample = new Date("2026-10-06T14:30:00.000Z");

describe("fechas", () => {
  it("formatea en la zona horaria del portal, no en la del servidor", () => {
    expect(formatDateTime(sample)).toBe("06/10/2026, 11:30");
  });

  it("formatea la fecha larga en español", () => {
    expect(formatDate(sample)).toBe("6 de octubre de 2026");
  });

  it("cruza el día cuando corresponde", () => {
    // 01:00 UTC del 7 es todavía el 6 a las 22:00 en Buenos Aires.
    expect(formatDateTime(new Date("2026-10-07T01:00:00.000Z"))).toBe("06/10/2026, 22:00");
  });

  it("el atributo datetime queda en ISO", () => {
    expect(toIsoString(sample)).toBe("2026-10-06T14:30:00.000Z");
  });
});
