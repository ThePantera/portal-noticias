import { z } from "zod";
import type { DollarKind, DollarQuote } from "@/types/exchange";

/**
 * Lectura de las fuentes de cotizaciones. Es código puro: la consulta por red vive en
 * src/server/services/exchange-rates.ts. Lo que se muestra en pantalla (y llega al
 * navegador) está en exchange-format.ts, sin zod.
 */

/** Las que muestra el portal, en este orden. Las demás que traiga la fuente se descartan. */
export const DOLLAR_KINDS: readonly DollarKind[] = ["blue", "oficial", "bolsa", "contadoconliqui", "tarjeta"];

/** Nombres cortos para pantalla; las fuentes usan otros ("Bolsa", "Contado con liquidación"). */
export const DOLLAR_LABELS: Record<DollarKind, string> = {
  blue: "Blue",
  oficial: "Oficial",
  bolsa: "MEP",
  contadoconliqui: "CCL",
  tarjeta: "Tarjeta",
  mayorista: "Mayorista",
  cripto: "Cripto",
};

const price = z.number().positive().finite().nullable().catch(null);

const dolarApiSchema = z.array(
  z.object({
    casa: z.string(),
    compra: price,
    venta: price,
    fechaActualizacion: z.string(),
  }),
);

function isShownKind(value: string): value is DollarKind {
  return (DOLLAR_KINDS as readonly string[]).includes(value);
}

function isoOrNull(value: string): string | null {
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function sortQuotes(quotes: DollarQuote[]): DollarQuote[] {
  return quotes.sort((a, b) => DOLLAR_KINDS.indexOf(a.kind) - DOLLAR_KINDS.indexOf(b.kind));
}

/**
 * Respuesta de https://dolarapi.com/v1/dolares: una lista con `casa`, `compra`, `venta` y
 * `fechaActualizacion`. Devuelve null si el formato no es el esperado o no trae el blue y el oficial.
 */
export function parseDolarApi(json: unknown): DollarQuote[] | null {
  const parsed = dolarApiSchema.safeParse(json);
  if (!parsed.success) return null;
  const quotes: DollarQuote[] = [];
  for (const row of parsed.data) {
    const kind = row.casa;
    const updatedAt = isoOrNull(row.fechaActualizacion);
    if (!isShownKind(kind) || !updatedAt || (row.compra === null && row.venta === null)) continue;
    if (quotes.some((q) => q.kind === kind)) continue;
    quotes.push({ kind, name: DOLLAR_LABELS[kind], buy: row.compra, sell: row.venta, updatedAt });
  }
  return hasMain(quotes) ? sortQuotes(quotes) : null;
}

const bluelyticsValue = z.object({ value_buy: price, value_sell: price });
const bluelyticsSchema = z.object({
  oficial: bluelyticsValue,
  blue: bluelyticsValue,
  last_update: z.string(),
});

/** Respuesta de https://api.bluelytics.com.ar/v2/latest (respaldo): sólo trae el blue y el oficial. */
export function parseBluelytics(json: unknown): DollarQuote[] | null {
  const parsed = bluelyticsSchema.safeParse(json);
  if (!parsed.success) return null;
  const updatedAt = isoOrNull(parsed.data.last_update);
  if (!updatedAt) return null;
  const quotes = (["blue", "oficial"] as const).map((kind) => ({
    kind,
    name: DOLLAR_LABELS[kind],
    buy: parsed.data[kind].value_buy,
    sell: parsed.data[kind].value_sell,
    updatedAt,
  }));
  return hasMain(quotes) ? quotes : null;
}

function hasMain(quotes: DollarQuote[]): boolean {
  return ["blue", "oficial"].every((kind) => quotes.some((q) => q.kind === kind && q.sell !== null));
}
