import { z } from "zod";
import type { MarketKind, MarketSeries } from "@/types/markets";

/**
 * Lectura de las fuentes de la sección Mercados. Es código puro: la consulta por red vive en
 * src/server/services/markets.ts. Lo que se muestra en pantalla (y llega al navegador) está
 * en market-format.ts, sin zod.
 */

export type MarketDefinition = {
  id: string;
  name: string;
  region: string;
  kind: MarketKind;
  unit: string;
  /** Símbolo en Yahoo Finance ("^GSPC", "BTC-USD"). */
  yahoo: string;
  /** Identificador en CoinGecko (sólo cripto). */
  coingecko?: string;
};

/** Bolsas que muestra el portal, en este orden. */
export const INDICES: readonly MarketDefinition[] = [
  { id: "sp500", name: "S&P 500", region: "EE.UU.", kind: "index", unit: "PTS", yahoo: "^GSPC" },
  { id: "nasdaq", name: "Nasdaq", region: "EE.UU.", kind: "index", unit: "PTS", yahoo: "^IXIC" },
  { id: "dowjones", name: "Dow Jones", region: "EE.UU.", kind: "index", unit: "PTS", yahoo: "^DJI" },
  { id: "merval", name: "Merval", region: "Argentina", kind: "index", unit: "PTS", yahoo: "^MERV" },
  { id: "bovespa", name: "Bovespa", region: "Brasil", kind: "index", unit: "PTS", yahoo: "^BVSP" },
  { id: "nikkei", name: "Nikkei 225", region: "Japón", kind: "index", unit: "PTS", yahoo: "^N225" },
  { id: "dax", name: "DAX", region: "Alemania", kind: "index", unit: "PTS", yahoo: "^GDAXI" },
];

/** Criptomonedas que muestra el portal, en este orden. Precio en dólares. */
export const CRYPTOS: readonly MarketDefinition[] = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    region: "BTC",
    kind: "crypto",
    unit: "USD",
    yahoo: "BTC-USD",
    coingecko: "bitcoin",
  },
  {
    id: "ethereum",
    name: "Ethereum",
    region: "ETH",
    kind: "crypto",
    unit: "USD",
    yahoo: "ETH-USD",
    coingecko: "ethereum",
  },
  {
    id: "tether",
    name: "Tether",
    region: "USDT",
    kind: "crypto",
    unit: "USD",
    yahoo: "USDT-USD",
    coingecko: "tether",
  },
  {
    id: "solana",
    name: "Solana",
    region: "SOL",
    kind: "crypto",
    unit: "USD",
    yahoo: "SOL-USD",
    coingecko: "solana",
  },
];

/** Puntos que se guardan por gráfico: alcanzan para un trazo prolijo y la respuesta queda liviana. */
const MAX_POINTS = 60;

/** Deja como mucho `max` valores, repartidos parejo y siempre con el primero y el último. */
export function downsample(values: number[], max = MAX_POINTS): number[] {
  if (values.length <= max) return values;
  const step = (values.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => values[Math.round(i * step)]!);
}

const finite = z.number().finite();

const yahooSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          meta: z.object({
            regularMarketPrice: finite.positive().optional(),
            regularMarketTime: finite.optional(),
          }),
          timestamp: z.array(finite).optional(),
          indicators: z.object({
            quote: z.array(z.object({ close: z.array(finite.nullable()).optional() })).min(1),
          }),
        }),
      )
      .min(1),
  }),
});

/**
 * Respuesta de https://query1.finance.yahoo.com/v8/finance/chart/{símbolo}?range=1mo&interval=1d.
 * La variación se calcula entre los dos últimos cierres de la serie. Devuelve null si el formato
 * no es el esperado o la serie no alcanza para un gráfico.
 */
export function parseYahooChart(
  json: unknown,
  definition: MarketDefinition,
  range = "Último mes",
): MarketSeries | null {
  const parsed = yahooSchema.safeParse(json);
  if (!parsed.success) return null;
  const [result] = parsed.data.chart.result;
  const closes = (result!.indicators.quote[0]!.close ?? []).filter(
    (value): value is number => value !== null && value > 0,
  );
  if (closes.length < 2) return null;
  const last = closes.at(-1)!;
  const previous = closes.at(-2)!;
  const price = result!.meta.regularMarketPrice ?? last;
  const time = result!.meta.regularMarketTime ?? result!.timestamp?.at(-1);
  if (time === undefined) return null;
  return {
    id: definition.id,
    name: definition.name,
    region: definition.region,
    kind: definition.kind,
    unit: definition.unit,
    price,
    changePercent: ((last - previous) / previous) * 100,
    points: downsample(closes),
    range,
    updatedAt: new Date(time * 1000).toISOString(),
  };
}

const coinGeckoSchema = z.array(
  z.object({
    id: z.string(),
    current_price: finite.positive(),
    price_change_percentage_24h: finite.nullable().optional(),
    last_updated: z.string(),
    sparkline_in_7d: z
      .object({ price: z.array(finite) })
      .nullable()
      .optional(),
  }),
);

/**
 * Respuesta de https://api.coingecko.com/api/v3/coins/markets con `sparkline=true`. Devuelve
 * las monedas de `definitions` en su orden, o null si el formato no es el esperado o falta alguna.
 */
export function parseCoinGecko(
  json: unknown,
  definitions: readonly MarketDefinition[],
): MarketSeries[] | null {
  const parsed = coinGeckoSchema.safeParse(json);
  if (!parsed.success) return null;
  const series: MarketSeries[] = [];
  for (const definition of definitions) {
    const coin = parsed.data.find((row) => row.id === definition.coingecko);
    const time = coin ? Date.parse(coin.last_updated) : Number.NaN;
    if (!coin || Number.isNaN(time)) return null;
    const points = (coin.sparkline_in_7d?.price ?? []).filter((value) => value > 0);
    series.push({
      id: definition.id,
      name: definition.name,
      region: definition.region,
      kind: definition.kind,
      unit: definition.unit,
      price: coin.current_price,
      changePercent: coin.price_change_percentage_24h ?? null,
      points: downsample(points.length >= 2 ? points : [coin.current_price, coin.current_price]),
      range: "Últimos 7 días",
      updatedAt: new Date(time).toISOString(),
    });
  }
  return series;
}
