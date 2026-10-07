import { describe, expect, it } from "vitest";
import { dollarGap, formatArs, formatPercent } from "@/lib/exchange-format";
import { parseBluelytics, parseDolarApi } from "@/lib/exchange-rates";

const dolarApi = [
  {
    moneda: "USD",
    casa: "oficial",
    nombre: "Oficial",
    compra: 1355,
    venta: 1405,
    fechaActualizacion: "2026-10-06T18:00:00.000Z",
  },
  {
    moneda: "USD",
    casa: "blue",
    nombre: "Blue",
    compra: 1410,
    venta: 1430,
    fechaActualizacion: "2026-10-06T18:05:00.000Z",
  },
  {
    moneda: "USD",
    casa: "bolsa",
    nombre: "Bolsa",
    compra: 1420.5,
    venta: 1428.3,
    fechaActualizacion: "2026-10-06T18:05:00.000Z",
  },
  {
    moneda: "USD",
    casa: "mayorista",
    nombre: "Mayorista",
    compra: 1370,
    venta: 1380,
    fechaActualizacion: "2026-10-06T18:00:00.000Z",
  },
  {
    moneda: "USD",
    casa: "tarjeta",
    nombre: "Tarjeta",
    compra: null,
    venta: 1826.5,
    fechaActualizacion: "2026-10-06T18:00:00.000Z",
  },
];

describe("cotizaciones del dólar", () => {
  it("lee DolarApi: sólo las casas que muestra el portal, en su orden y con nombres cortos", () => {
    const quotes = parseDolarApi(dolarApi);
    expect(quotes?.map((q) => [q.kind, q.name])).toEqual([
      ["blue", "Blue"],
      ["oficial", "Oficial"],
      ["bolsa", "MEP"],
      ["tarjeta", "Tarjeta"],
    ]);
    expect(quotes?.[0]).toEqual({
      kind: "blue",
      name: "Blue",
      buy: 1410,
      sell: 1430,
      updatedAt: "2026-10-06T18:05:00.000Z",
    });
    expect(quotes?.find((q) => q.kind === "tarjeta")?.buy).toBeNull();
  });

  it("descarta respuestas rotas o sin el blue y el oficial", () => {
    expect(parseDolarApi({ error: "rate limit" })).toBeNull();
    expect(parseDolarApi(dolarApi.filter((q) => q.casa !== "blue"))).toBeNull();
    expect(parseDolarApi([{ ...dolarApi[0], venta: "n/d" }, dolarApi[1]])).toBeNull();
  });

  it("lee Bluelytics como respaldo", () => {
    const quotes = parseBluelytics({
      oficial: { value_avg: 1380, value_sell: 1405, value_buy: 1355 },
      blue: { value_avg: 1420, value_sell: 1430, value_buy: 1410 },
      last_update: "2026-10-06T15:05:00.000-03:00",
    });
    expect(quotes).toEqual([
      { kind: "blue", name: "Blue", buy: 1410, sell: 1430, updatedAt: "2026-10-06T18:05:00.000Z" },
      { kind: "oficial", name: "Oficial", buy: 1355, sell: 1405, updatedAt: "2026-10-06T18:05:00.000Z" },
    ]);
    expect(parseBluelytics({ blue: {} })).toBeNull();
  });

  it("calcula la brecha entre el blue y el oficial", () => {
    const quotes = parseDolarApi(dolarApi) ?? [];
    expect(dollarGap({ quotes })).toBeCloseTo(1.779, 2);
    expect(dollarGap({ quotes: quotes.filter((q) => q.kind !== "oficial") })).toBeNull();
  });

  it("formatea pesos y porcentajes como en Argentina", () => {
    expect(formatArs(1435)).toMatch(/^\$\s1\.435$/);
    expect(formatArs(1428.3)).toMatch(/^\$\s1\.428,3$/);
    expect(formatArs(null)).toBe("—");
    expect(formatPercent(1.779)).toBe("1,8 %");
  });
});
