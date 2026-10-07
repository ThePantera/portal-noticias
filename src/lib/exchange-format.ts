import type { DollarRates } from "@/types/exchange";

/** Brecha entre el blue y el oficial, en porcentaje sobre el oficial (precios de venta). */
export function dollarGap(rates: Pick<DollarRates, "quotes">): number | null {
  const blue = rates.quotes.find((q) => q.kind === "blue")?.sell;
  const official = rates.quotes.find((q) => q.kind === "oficial")?.sell;
  if (!blue || !official) return null;
  return ((blue - official) / official) * 100;
}

const ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** "$ 1.435" o "$ 1.435,5". Sin valor, una raya. */
export function formatArs(value: number | null): string {
  return value === null ? "—" : ars.format(value);
}

const percent = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** "3,2 %". */
export function formatPercent(value: number): string {
  return `${percent.format(value)} %`;
}
