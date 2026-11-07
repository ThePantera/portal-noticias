import { describe, expect, it } from "vitest";
import { ZODIAC_SIGNS, dailyHoroscope, dailyHoroscopes } from "@/lib/horoscope";

describe("horóscopo", () => {
  it("tiene los doce signos con anclas únicas", () => {
    expect(ZODIAC_SIGNS).toHaveLength(12);
    expect(new Set(ZODIAC_SIGNS.map((s) => s.slug)).size).toBe(12);
    expect(ZODIAC_SIGNS[0].slug).toBe("aries");
    expect(ZODIAC_SIGNS[11].slug).toBe("piscis");
  });

  it("la misma fecha y el mismo signo dan siempre el mismo texto", () => {
    for (const sign of ZODIAC_SIGNS) {
      expect(dailyHoroscope(sign, "2026-11-07")).toEqual(dailyHoroscope(sign, "2026-11-07"));
    }
    expect(dailyHoroscopes("2026-11-07")).toEqual(dailyHoroscopes("2026-11-07"));
  });

  it("cambia de un día a otro", () => {
    const today = dailyHoroscopes("2026-11-07");
    const tomorrow = dailyHoroscopes("2026-11-08");
    const changed = today.filter((h, i) => JSON.stringify(h) !== JSON.stringify(tomorrow[i]));
    expect(changed.length).toBeGreaterThan(6);
  });

  it("no da el mismo texto a todos los signos el mismo día", () => {
    const loves = new Set(dailyHoroscopes("2026-11-07").map((h) => h.love));
    expect(loves.size).toBeGreaterThan(1);
  });

  it("el número de la suerte va de 1 a 99", () => {
    for (let day = 1; day <= 28; day++) {
      const date = `2026-02-${String(day).padStart(2, "0")}`;
      for (const h of dailyHoroscopes(date)) {
        expect(h.luckyNumber).toBeGreaterThanOrEqual(1);
        expect(h.luckyNumber).toBeLessThanOrEqual(99);
        expect(Number.isInteger(h.luckyNumber)).toBe(true);
        expect(h.luckyColor.length).toBeGreaterThan(0);
      }
    }
  });
});
