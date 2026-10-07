import { changeTrend, formatChange, formatMarketPrice } from "@/lib/market-format";
import type { MarketSeries } from "@/types/markets";
import { Sparkline } from "./Sparkline";

const ARROW = { up: "▲", down: "▼", flat: "•" } as const;
/** Variación del período del gráfico, en porcentaje: decide su color. */
function periodChange(points: number[]): number | null {
  const first = points[0];
  const last = points.at(-1);
  return first && last ? ((last - first) / first) * 100 : null;
}

const TREND_LABEL = { up: "sube", down: "baja", flat: "sin cambios" } as const;

/** Tarjeta de un índice o una moneda: nombre, valor, variación y gráfico del período. */
export function MarketCard({ series }: { series: MarketSeries }) {
  const trend = changeTrend(series.changePercent);
  const pill =
    trend === "up"
      ? "bg-success/12 text-success"
      : trend === "down"
        ? "bg-danger/12 text-danger"
        : "bg-surface-muted text-ink-muted";
  return (
    <li className="flex min-w-0 flex-col rounded-card border border-rule bg-surface p-4 shadow-card transition-shadow hover:shadow-raised">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-bold">{series.name}</h3>
          <p className="text-xs text-ink-subtle">{series.region}</p>
        </div>
        <p
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${pill}`}
          title={series.kind === "crypto" ? "Variación en 24 horas" : "Variación frente al cierre anterior"}
        >
          <span aria-hidden="true">{ARROW[trend]} </span>
          {formatChange(series.changePercent)}
          <span className="sr-only">, {TREND_LABEL[trend]}</span>
        </p>
      </div>
      <p className="mt-2 font-display text-2xl leading-none font-bold tabular-nums">
        {formatMarketPrice(series)}
        {series.unit === "PTS" ? (
          <span className="ml-1 text-xs font-semibold text-ink-subtle">pts</span>
        ) : null}
      </p>
      <div className="mt-3">
        <Sparkline points={series.points} trend={changeTrend(periodChange(series.points))} />
        <p className="mt-1 text-right text-[0.6875rem] text-ink-subtle">{series.range}</p>
      </div>
    </li>
  );
}
