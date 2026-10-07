import "server-only";
import { cacheLife } from "next/cache";
import { CRYPTOS, INDICES, parseCoinGecko, parseYahooChart, type MarketDefinition } from "@/lib/markets";
import type { MarketSeries, MarketSource, MarketsSnapshot } from "@/types/markets";

const YAHOO: MarketSource = { name: "Yahoo Finance", url: "https://finance.yahoo.com" };
const COINGECKO: MarketSource = { name: "CoinGecko", url: "https://www.coingecko.com" };

/** Yahoo responde en dos hosts iguales: si uno falla se prueba el otro. */
const YAHOO_HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

/** Datos cada media hora: lo que dura la caché si respondió todo. */
const FRESH = { stale: 300, revalidate: 1800, expire: 7200 };

async function getJson(url: string, label: string): Promise<unknown> {
  try {
    const response = await fetch(url, {
      // Yahoo rechaza pedidos sin un agente de navegador.
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; portal-noticias)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Mercados: ${label} no respondió bien`, error);
    return null;
  }
}

async function fromYahoo(definition: MarketDefinition): Promise<MarketSeries | null> {
  const symbol = encodeURIComponent(definition.yahoo);
  for (const host of YAHOO_HOSTS) {
    const json = await getJson(
      `${host}/v8/finance/chart/${symbol}?range=1mo&interval=1d`,
      `Yahoo ${definition.yahoo}`,
    );
    const series = json ? parseYahooChart(json, definition) : null;
    if (series) return series;
  }
  return null;
}

async function getIndices(): Promise<MarketSeries[]> {
  const series = await Promise.all(INDICES.map(fromYahoo));
  return series.filter((s): s is MarketSeries => s !== null);
}

/**
 * CoinGecko trae las cuatro monedas y siete días de gráfico en un pedido, sin llave. Si no
 * responde, cada moneda se pide a Yahoo (un mes de cierres diarios).
 */
async function getCrypto(): Promise<{ series: MarketSeries[]; source: MarketSource | null }> {
  const ids = CRYPTOS.map((c) => c.coingecko).join(",");
  const json = await getJson(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=24h`,
    "CoinGecko",
  );
  const fromGecko = json ? parseCoinGecko(json, CRYPTOS) : null;
  if (fromGecko) return { series: fromGecko, source: COINGECKO };
  const series = (await Promise.all(CRYPTOS.map(fromYahoo))).filter((s): s is MarketSeries => s !== null);
  return { series, source: series.length > 0 ? YAHOO : null };
}

/**
 * Bolsas y criptomonedas para la sección Mercados. Se guarda en caché media hora: todas las
 * visitas comparten una consulta a las fuentes. Si algo no respondió se reintenta en unos
 * minutos. Si no respondió nada devuelve null y la página lo dice, nunca falla.
 */
export async function getMarkets(): Promise<MarketsSnapshot | null> {
  "use cache";
  const [indices, crypto] = await Promise.all([getIndices(), getCrypto()]);
  const complete = indices.length === INDICES.length && crypto.series.length === CRYPTOS.length;
  if (complete) cacheLife(FRESH);
  else cacheLife("minutes");
  if (indices.length === 0 && crypto.series.length === 0) return null;
  const sources = [indices.length > 0 ? YAHOO : null, crypto.source]
    .filter((s): s is MarketSource => s !== null)
    .filter((s, i, all) => all.findIndex((o) => o.name === s.name) === i);
  return { indices, crypto: crypto.series, sources, fetchedAt: new Date().toISOString() };
}
