import type { MarketSeries } from "@/types/markets";

/**
 * Formato para pantalla de la sección Mercados. Llega al navegador: no importa zod.
 */

const points = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

/** "6.512,40" para índices; "US$ 62.410" o "US$ 1,00" para cripto. */
export function formatMarketPrice(series: Pick<MarketSeries, "price" | "unit">): string {
  if (series.unit === "PTS") return points.format(series.price);
  const digits = series.price >= 1000 ? 0 : series.price >= 1 ? 2 : 4;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: series.unit,
    currencyDisplay: "symbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(series.price);
}

const change = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  signDisplay: "exceptZero",
});

/** "+1,24 %", "-0,80 %". Sin dato, una raya. */
export function formatChange(value: number | null): string {
  return value === null ? "—" : `${change.format(value)} %`;
}

/** "up", "down" o "flat": decide el color y la flecha. */
export function changeTrend(value: number | null): "up" | "down" | "flat" {
  if (value === null || Math.abs(value) < 0.005) return "flat";
  return value > 0 ? "up" : "down";
}

/**
 * Trazo SVG del gráfico chico: `line` es la línea y `area` el relleno debajo, en un lienzo
 * de `width` × `height`. Con un solo valor (o todos iguales) dibuja una línea recta al medio.
 */
export function sparklinePath(
  values: number[],
  width: number,
  height: number,
): { line: string; area: string } {
  if (values.length === 0) return { line: "", area: "" };
  const series = values.length === 1 ? [values[0]!, values[0]!] : values;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const pad = 2;
  const usable = height - pad * 2;
  const x = (i: number) => (i / (series.length - 1)) * width;
  const y = (value: number) => (max === min ? height / 2 : pad + (1 - (value - min) / (max - min)) * usable);
  const round = (n: number) => Math.round(n * 100) / 100;
  const line = series.map((v, i) => `${i === 0 ? "M" : "L"}${round(x(i))} ${round(y(v))}`).join(" ");
  return { line, area: `${line} L${width} ${height} L0 ${height} Z` };
}

export type DiceFace = 1 | 2 | 3 | 4 | 5 | 6;

/** Del 1 al 3 el dado dice que baja; del 4 al 6, que sube. */
export function diceVerdict(face: DiceFace): "sube" | "baja" {
  return face >= 4 ? "sube" : "baja";
}

/** Cara al azar a partir de un número en [0, 1) (Math.random u otro generador). */
export function faceFromRandom(random: number): DiceFace {
  return (Math.min(5, Math.floor(random * 6)) + 1) as DiceFace;
}
