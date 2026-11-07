import { describe, expect, it } from "vitest";
import {
  CITIES,
  describeWeather,
  formatForecastDay,
  formatObservedTime,
  formatTemperature,
  openMeteoUrl,
  parseOpenMeteo,
} from "@/lib/weather";

/** Una ciudad tal como la devuelve /v1/forecast (con los campos que pedimos). */
function location(temperature: number, code: number, extra: Record<string, unknown> = {}) {
  return {
    latitude: -34.625,
    longitude: -58.375,
    timezone: "America/Argentina/Buenos_Aires",
    current_units: { time: "iso8601", temperature_2m: "°C", weather_code: "wmo code" },
    current: {
      time: "2026-11-07T14:15",
      interval: 900,
      temperature_2m: temperature,
      weather_code: code,
      is_day: 1,
    },
    daily: {
      time: ["2026-11-07", "2026-11-08", "2026-11-09"],
      weather_code: [code, 61, null],
      temperature_2m_max: [27.4, 22.1, 24],
      temperature_2m_min: [16.2, 14.8, 15],
    },
    ...extra,
  };
}

const TWO = CITIES.slice(0, 2);

describe("clima", () => {
  it("arma un solo pedido con todas las ciudades", () => {
    const url = new URL(openMeteoUrl(TWO));
    expect(url.origin + url.pathname).toBe("https://api.open-meteo.com/v1/forecast");
    expect(url.searchParams.get("latitude")).toBe("-34.6037,-31.4201");
    expect(url.searchParams.get("longitude")).toBe("-58.3816,-64.1888");
    expect(url.searchParams.get("timezone")).toBe("America/Argentina/Buenos_Aires");
    expect(url.searchParams.get("daily")).toContain("temperature_2m_max");
  });

  it("lee la lista de ciudades en el orden del pedido y descarta días incompletos", () => {
    const weather = parseOpenMeteo([location(23.6, 2), location(30.1, 0)], TWO);
    expect(weather?.map((w) => w.city.name)).toEqual(["Buenos Aires", "Córdoba"]);
    expect(weather?.[0]).toMatchObject({
      temperature: 23.6,
      code: 2,
      isDay: true,
      observedAt: "2026-11-07T14:15",
    });
    expect(weather?.[0].daily).toEqual([
      { date: "2026-11-07", code: 2, max: 27.4, min: 16.2 },
      { date: "2026-11-08", code: 61, max: 22.1, min: 14.8 },
    ]);
  });

  it("usa location_id si viene y acepta la respuesta de una sola ciudad", () => {
    const shuffled = [location(30, 0, { location_id: 1 }), location(20, 3, { location_id: 0 })];
    const weather = parseOpenMeteo(shuffled, TWO);
    expect(weather?.map((w) => [w.city.id, w.temperature])).toEqual([
      ["buenos-aires", 20],
      ["cordoba", 30],
    ]);
    expect(parseOpenMeteo(location(18, 3), TWO)?.[0].city.id).toBe("buenos-aires");
  });

  it("saltea ciudades rotas y devuelve null si no queda ninguna", () => {
    const broken = { ...location(1, 1), current: { time: "2026-11-07T14:15", temperature_2m: null } };
    expect(parseOpenMeteo([broken, location(30, 0)], TWO)?.map((w) => w.city.id)).toEqual(["cordoba"]);
    expect(parseOpenMeteo({ error: true, reason: "Parameter latitude must be in range" }, TWO)).toBeNull();
    expect(parseOpenMeteo([], TWO)).toBeNull();
    expect(parseOpenMeteo(null, TWO)).toBeNull();
  });

  it("traduce los códigos WMO", () => {
    expect(describeWeather(0)).toEqual({ label: "Despejado", icon: "☀️" });
    expect(describeWeather(0, false).icon).toBe("🌙");
    expect(describeWeather(63).label).toBe("Lluvia");
    expect(describeWeather(95).label).toBe("Tormenta");
    expect(describeWeather(1234).label).toBe("Sin datos");
  });

  it("formatea temperaturas, horas y días", () => {
    expect(formatTemperature(23.6)).toBe("24°");
    expect(formatTemperature(-0.3)).toBe("0°");
    expect(formatTemperature(-2.6)).toBe("-3°");
    expect(formatObservedTime("2026-11-07T14:15")).toBe("14:15");
    expect(formatForecastDay("2026-11-08")).toBe("domingo 8");
  });
});
