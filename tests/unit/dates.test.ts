import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  parseDateTimeInput,
  toDateTimeInputValue,
  toIsoString,
} from "@/lib/dates";

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

describe("campo de fecha y hora del editor", () => {
  it("lee la hora como de Buenos Aires aunque el servidor esté en UTC", () => {
    expect(parseDateTimeInput("2026-10-07T09:30")?.toISOString()).toBe("2026-10-07T12:30:00.000Z");
  });

  it("ida y vuelta sin perder minutos, también cruzando la medianoche", () => {
    for (const value of ["2026-10-07T09:30", "2026-12-31T23:59", "2027-01-01T00:00"]) {
      const parsed = parseDateTimeInput(value);
      expect(parsed && toDateTimeInputValue(parsed)).toBe(value);
    }
    expect(toDateTimeInputValue(new Date("2026-10-07T01:00:00.000Z"))).toBe("2026-10-06T22:00");
  });

  it("rechaza lo que no es una fecha", () => {
    for (const value of ["", "mañana", "2026-02-31T10:00", "2026-10-07T25:00", "2026-10-07 09:30"]) {
      expect(parseDateTimeInput(value)).toBeNull();
    }
  });
});
