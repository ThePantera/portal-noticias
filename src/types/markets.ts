/** Bolsas y criptomonedas de la sección Mercados. Las fechas viajan como texto ISO: las lee también el navegador. */

export type MarketKind = "index" | "crypto";

export type MarketSeries = {
  /** Identificador estable del portal ("sp500", "bitcoin"). */
  id: string;
  name: string;
  /** Dónde cotiza o qué es, para la tarjeta ("EE.UU.", "Argentina", "Cripto"). */
  region: string;
  kind: MarketKind;
  /** Moneda del precio ("USD", "ARS", "BRL", "JPY", "EUR") o "PTS" para índices en puntos. */
  unit: string;
  /** Último valor informado por la fuente. */
  price: number;
  /** Variación porcentual frente al cierre anterior (índices) o a las últimas 24 h (cripto). */
  changePercent: number | null;
  /** Valores para el gráfico, del más viejo al más nuevo. */
  points: number[];
  /** Período que cubre el gráfico, para pantalla ("Último mes", "Últimos 7 días"). */
  range: string;
  /** Cuándo la fuente actualizó este valor. */
  updatedAt: string;
};

export type MarketSource = { name: string; url: string };

export type MarketsSnapshot = {
  indices: MarketSeries[];
  crypto: MarketSeries[];
  /** Fuentes que respondieron, para citarlas en pantalla. */
  sources: MarketSource[];
  /** Cuándo el portal consultó las fuentes. */
  fetchedAt: string;
};
