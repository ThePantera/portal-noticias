"use client";

import { formatTime } from "@/lib/dates";
import type { MarketSeries, MarketsSnapshot } from "@/types/markets";
import { MarketCard } from "./MarketCard";
import { useMarkets } from "./useMarkets";

function Group({
  id,
  title,
  note,
  series,
}: {
  id: string;
  title: string;
  note: string;
  series: MarketSeries[];
}) {
  if (series.length === 0) return null;
  return (
    <section aria-labelledby={id} className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id={id}
          className="flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight md:text-2xl"
        >
          <span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-accent" />
          {title}
        </h2>
        <p className="text-xs text-ink-subtle">{note}</p>
      </div>
      <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {series.map((s) => (
          <MarketCard key={s.id} series={s} />
        ))}
      </ul>
    </section>
  );
}

/** Tableros de bolsas y criptomonedas. Se actualizan solos cada media hora. */
export function MarketsBoard({ initial }: { initial: MarketsSnapshot | null }) {
  const markets = useMarkets(initial);

  if (!markets) {
    return (
      <p className="rounded-card border border-rule bg-surface p-5 text-sm text-ink-muted shadow-card">
        No pudimos traer las cotizaciones de los mercados. Se vuelve a intentar sola en unos minutos.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-10">
      <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        <span aria-hidden="true" className="live-dot" />
        Actualizado a las{" "}
        <time dateTime={markets.fetchedAt} className="font-semibold text-ink tabular-nums">
          {formatTime(new Date(markets.fetchedAt))}
        </time>
        · se renueva cada media hora
      </p>
      <Group
        id="bolsas"
        title="Bolsas del mundo"
        note="Variación frente al cierre anterior · horario de cada bolsa"
        series={markets.indices}
      />
      <Group
        id="criptomonedas"
        title="Criptomonedas"
        note="Precio en dólares · variación en 24 horas"
        series={markets.crypto}
      />
      <p className="border-t border-rule pt-4 text-xs text-ink-subtle">
        Fuentes:{" "}
        {markets.sources.map((source, i) => (
          <span key={source.name}>
            {i > 0 ? ", " : null}
            <a href={source.url} className="underline hover:text-ink" rel="noopener">
              {source.name}
            </a>
          </span>
        ))}
        . Valores de referencia con demora; no son precios para operar.
      </p>
    </div>
  );
}
