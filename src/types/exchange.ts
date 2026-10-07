/** Cotizaciones del dólar frente al peso. Las fechas viajan como texto ISO: las lee también el navegador. */

export type DollarKind =
  | "oficial"
  | "blue"
  | "bolsa"
  | "contadoconliqui"
  | "tarjeta"
  | "mayorista"
  | "cripto";

export type DollarQuote = {
  kind: DollarKind;
  name: string;
  /** Pesos por dólar. null si la fuente no informa ese lado. */
  buy: number | null;
  sell: number | null;
  /** Cuándo la fuente actualizó este valor. */
  updatedAt: string;
};

export type DollarRates = {
  quotes: DollarQuote[];
  /** Nombre de la fuente, para citarla en pantalla. */
  source: string;
  sourceUrl: string;
  /** Cuándo el portal consultó la fuente. */
  fetchedAt: string;
};
