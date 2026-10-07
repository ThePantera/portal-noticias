"use client";

import { formatTime } from "@/lib/dates";
import { dollarGap, formatArs, formatPercent } from "@/lib/exchange-format";
import type { DollarQuote, DollarRates } from "@/types/exchange";
import { useDollarRates } from "./useDollarRates";

function lastUpdate(quotes: DollarQuote[]): Date {
  return new Date(Math.max(...quotes.map((q) => Date.parse(q.updatedAt))));
}

/** Panel de la portada: blue y oficial grandes, el resto en una tabla, la brecha y la fuente. */
export function DollarPanel({ initial }: { initial: DollarRates | null }) {
  const rates = useDollarRates(initial);
  const main = rates?.quotes.filter((q) => q.kind === "blue" || q.kind === "oficial") ?? [];
  const others = rates?.quotes.filter((q) => q.kind !== "blue" && q.kind !== "oficial") ?? [];
  const gap = rates ? dollarGap(rates) : null;

  return (
    <section
      aria-labelledby="dolar-hoy"
      className="rounded-card border border-rule bg-surface p-5 shadow-card"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="dolar-hoy" className="flex items-center gap-2 text-sm font-bold tracking-wide uppercase">
          <span aria-hidden="true" className="live-dot" />
          Dólar hoy
        </h2>
        {rates ? (
          <p className="text-xs text-ink-subtle">
            Actualizado a las{" "}
            <time dateTime={lastUpdate(rates.quotes).toISOString()}>
              {formatTime(lastUpdate(rates.quotes))}
            </time>
          </p>
        ) : null}
      </div>

      {rates ? (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-3">
            {main.map((quote) => (
              <li key={quote.kind} className="rounded-xl bg-surface-muted p-3">
                <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                  Dólar {quote.name}
                </p>
                <p className="mt-1 font-display text-2xl leading-none font-bold tabular-nums">
                  {formatArs(quote.sell)}
                  <span className="sr-only"> venta</span>
                </p>
                <p className="mt-1.5 text-xs text-ink-subtle tabular-nums">Compra {formatArs(quote.buy)}</p>
              </li>
            ))}
          </ul>

          {others.length > 0 ? (
            <table className="mt-4 w-full text-sm">
              <caption className="sr-only">Otras cotizaciones del dólar</caption>
              <thead>
                <tr className="text-xs text-ink-subtle">
                  <th scope="col" className="pb-1 text-left font-medium">
                    Dólar
                  </th>
                  <th scope="col" className="pb-1 text-right font-medium">
                    Compra
                  </th>
                  <th scope="col" className="pb-1 text-right font-medium">
                    Venta
                  </th>
                </tr>
              </thead>
              <tbody>
                {others.map((quote) => (
                  <tr key={quote.kind} className="border-t border-rule">
                    <th scope="row" className="py-1.5 text-left font-semibold">
                      {quote.name}
                    </th>
                    <td className="py-1.5 text-right text-ink-muted tabular-nums">{formatArs(quote.buy)}</td>
                    <td className="py-1.5 text-right font-semibold tabular-nums">{formatArs(quote.sell)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-3 text-xs text-ink-subtle">
            {gap !== null ? (
              <p>
                Brecha blue / oficial:{" "}
                <span className="font-semibold text-ink tabular-nums">{formatPercent(gap)}</span>
              </p>
            ) : null}
            <p>
              Fuente:{" "}
              <a href={rates.sourceUrl} className="underline hover:text-ink" rel="noopener">
                {rates.source}
              </a>
            </p>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-ink-muted">
          No pudimos actualizar la cotización. Se vuelve a intentar sola en un minuto.
        </p>
      )}
    </section>
  );
}
