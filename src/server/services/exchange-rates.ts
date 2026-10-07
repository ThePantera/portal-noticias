import "server-only";
import { cacheLife } from "next/cache";
import { parseBluelytics, parseDolarApi } from "@/lib/exchange-rates";
import type { DollarQuote, DollarRates } from "@/types/exchange";

type Source = { name: string; url: string; endpoint: string; parse: (json: unknown) => DollarQuote[] | null };

/**
 * DolarApi trae blue, oficial, MEP, CCL y tarjeta en un solo pedido, sin llave. Bluelytics
 * queda de respaldo (sólo blue y oficial) por si la primera no responde o cambia el formato.
 */
const SOURCES: Source[] = [
  {
    name: "DolarApi",
    url: "https://dolarapi.com",
    endpoint: "https://dolarapi.com/v1/dolares",
    parse: parseDolarApi,
  },
  {
    name: "Bluelytics",
    url: "https://bluelytics.com.ar",
    endpoint: "https://api.bluelytics.com.ar/v2/latest",
    parse: parseBluelytics,
  },
];

async function fetchFrom(source: Source): Promise<DollarQuote[] | null> {
  try {
    const response = await fetch(source.endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const quotes = source.parse(await response.json());
    if (!quotes) throw new Error("formato inesperado");
    return quotes;
  } catch (error) {
    console.error(`Cotizaciones: ${source.name} no respondió bien`, error);
    return null;
  }
}

/**
 * Cotización del dólar para todo el sitio. Se guarda en caché un minuto: todas las visitas
 * comparten una sola consulta a la fuente. Si ninguna fuente responde devuelve null y el
 * sitio muestra el panel sin números, nunca un error.
 */
export async function getDollarRates(): Promise<DollarRates | null> {
  "use cache";
  cacheLife("minutes");
  for (const source of SOURCES) {
    const quotes = await fetchFrom(source);
    if (quotes)
      return { quotes, source: source.name, sourceUrl: source.url, fetchedAt: new Date().toISOString() };
  }
  return null;
}
