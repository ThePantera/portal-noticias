import { describe, expect, it } from "vitest";
import {
  changeTrend,
  diceVerdict,
  faceFromRandom,
  formatChange,
  formatMarketPrice,
  sparklinePath,
} from "@/lib/market-format";
import { CRYPTOS, INDICES, downsample, parseCoinGecko, parseYahooChart } from "@/lib/markets";

const merval = INDICES.find((i) => i.id === "merval")!;

function yahoo(closes: (number | null)[], meta: Record<string, unknown> = {}) {
  return {
    chart: {
      result: [
        {
          meta: { currency: "ARS", symbol: "^MERV", regularMarketTime: 1_791_403_200, ...meta },
          timestamp: closes.map((_, i) => 1_791_000_000 + i * 86_400),
          indicators: { quote: [{ open: closes, close: closes }] },
        },
      ],
      error: null,
    },
  };
}

describe("mercados: fuentes", () => {
  it("lee Yahoo: precio, variación entre los dos últimos cierres y gráfico sin huecos", () => {
    const series = parseYahooChart(yahoo([100, null, 110, 99], { regularMarketPrice: 99.5 }), merval);
    expect(series?.changePercent).toBeCloseTo(-10);
    expect(series).toEqual({
      id: "merval",
      name: "Merval",
      region: "Argentina",
      kind: "index",
      unit: "PTS",
      price: 99.5,
      changePercent: series?.changePercent,
      points: [100, 110, 99],
      range: "Último mes",
      updatedAt: new Date(1_791_403_200 * 1000).toISOString(),
    });
  });

  it("Yahoo: sin precio en meta usa el último cierre; sin datos suficientes o con error devuelve null", () => {
    expect(parseYahooChart(yahoo([100, 120]), merval)?.price).toBe(120);
    expect(parseYahooChart(yahoo([100, null]), merval)).toBeNull();
    expect(parseYahooChart({ chart: { result: null, error: { code: "Not Found" } } }, merval)).toBeNull();
    expect(parseYahooChart("<html>", merval)).toBeNull();
  });

  const gecko = CRYPTOS.map((c, i) => ({
    id: c.coingecko,
    symbol: c.region.toLowerCase(),
    current_price: 1000 * (i + 1),
    price_change_percentage_24h: i === 2 ? null : 1.5,
    last_updated: "2026-10-07T03:00:00.000Z",
    sparkline_in_7d: { price: Array.from({ length: 168 }, (_, h) => 900 + h) },
  }));

  it("lee CoinGecko en el orden del portal y achica el gráfico a 60 puntos", () => {
    const series = parseCoinGecko([...gecko].reverse(), CRYPTOS);
    expect(series?.map((s) => s.id)).toEqual(["bitcoin", "ethereum", "tether", "solana"]);
    expect(series?.[0]).toMatchObject({
      price: 1000,
      changePercent: 1.5,
      range: "Últimos 7 días",
      unit: "USD",
    });
    expect(series?.[2]?.changePercent).toBeNull();
    expect(series?.[0]?.points).toHaveLength(60);
    expect(series?.[0]?.points[0]).toBe(900);
    expect(series?.[0]?.points.at(-1)).toBe(1067);
  });

  it("CoinGecko: si falta una moneda o cambia el formato devuelve null", () => {
    expect(parseCoinGecko(gecko.slice(1), CRYPTOS)).toBeNull();
    expect(parseCoinGecko({ status: { error_code: 429 } }, CRYPTOS)).toBeNull();
  });

  it("downsample conserva el primero y el último", () => {
    expect(downsample([1, 2, 3], 5)).toEqual([1, 2, 3]);
    expect(downsample([0, 1, 2, 3, 4, 5, 6, 7, 8], 3)).toEqual([0, 4, 8]);
  });
});

describe("mercados: pantalla", () => {
  it("formatea índices en puntos y cripto en dólares", () => {
    expect(formatMarketPrice({ price: 6512.4, unit: "PTS" })).toBe("6.512,40");
    expect(formatMarketPrice({ price: 62410.7, unit: "USD" })).toMatch(/62\.411$/);
    expect(formatMarketPrice({ price: 1.0002, unit: "USD" })).toMatch(/1,00$/);
  });

  it("variación con signo y tendencia", () => {
    expect(formatChange(1.234)).toBe("+1,23 %");
    expect(formatChange(-0.8)).toBe("-0,80 %");
    expect(formatChange(null)).toBe("—");
    expect([changeTrend(0.5), changeTrend(-0.5), changeTrend(0), changeTrend(null)]).toEqual([
      "up",
      "down",
      "flat",
      "flat",
    ]);
  });

  it("el gráfico va de borde a borde y una serie plana queda al medio", () => {
    const { line, area } = sparklinePath([1, 3, 2], 100, 20);
    expect(line).toBe("M0 18 L50 2 L100 10");
    expect(area).toBe("M0 18 L50 2 L100 10 L100 20 L0 20 Z");
    expect(sparklinePath([5], 100, 20).line).toBe("M0 10 L100 10");
    expect(sparklinePath([], 100, 20).line).toBe("");
  });

  it("dado: del 1 al 3 baja, del 4 al 6 sube, y el azar cubre las seis caras", () => {
    expect([1, 2, 3, 4, 5, 6].map((f) => diceVerdict(f as 1))).toEqual([
      "baja",
      "baja",
      "baja",
      "sube",
      "sube",
      "sube",
    ]);
    expect([0, 0.17, 0.34, 0.5, 0.67, 0.84, 0.9999].map(faceFromRandom)).toEqual([1, 2, 3, 4, 5, 6, 6]);
  });
});
