"use client";

import { dollarGap, formatArs, formatPercent } from "@/lib/exchange-format";
import type { DollarRates } from "@/types/exchange";
import { useDollarRates } from "./useDollarRates";

/** Barra fina arriba de la cabecera, en todas las páginas: precio de venta de cada dólar y la brecha. */
export function DollarTicker({ initial }: { initial: DollarRates | null }) {
  const rates = useDollarRates(initial);
  const gap = rates ? dollarGap(rates) : null;

  return (
    <section aria-label="Cotización del dólar" className="bg-night text-on-night">
      <div className="relative mx-auto flex max-w-site [scrollbar-width:none] items-center gap-5 overflow-x-auto px-4 py-2 text-xs md:px-8">
        <p className="flex shrink-0 items-center gap-2 font-semibold tracking-wide text-on-night-muted uppercase">
          <span aria-hidden="true" className="live-dot" />
          Dólar hoy
        </p>
        {rates ? (
          <ul className="flex shrink-0 items-center gap-5">
            {rates.quotes.map((quote) => (
              <li key={quote.kind} className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-on-night-muted">{quote.name}</span>
                <span className="font-semibold tabular-nums">{formatArs(quote.sell)}</span>
                <span className="sr-only">(venta)</span>
              </li>
            ))}
            {gap !== null ? (
              <li className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-on-night-muted">Brecha</span>
                <span className="font-semibold tabular-nums">{formatPercent(gap)}</span>
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="shrink-0 text-on-night-muted">Cotización no disponible por el momento</p>
        )}
      </div>
    </section>
  );
}
