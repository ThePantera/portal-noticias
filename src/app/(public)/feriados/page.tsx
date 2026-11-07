import type { Metadata } from "next";
import { HOLIDAY_KIND_LABEL, daysUntil, formatHolidayDate, nextHoliday, type Holiday } from "@/lib/holidays";
import { getHolidayCalendar } from "@/server/services/holidays";

export const metadata: Metadata = {
  title: "Feriados en la Argentina",
  description:
    "Calendario de feriados nacionales y días no laborables de la Argentina, con cuántos días faltan para el próximo.",
  alternates: { canonical: "/feriados" },
};

const SOURCE_NOTE =
  "Fuente: ArgentinaDatos (argentinadatos.com), que publica el calendario oficial. Ante un cambio de último momento, vale lo que diga el Gobierno nacional.";

function countdown(days: number): string {
  if (days === 0) return "Es hoy";
  if (days === 1) return "Es mañana";
  return `Faltan ${days} días`;
}

export default async function HolidaysPage() {
  const { today, year, current, following } = await getHolidayCalendar();
  const all: Holiday[] = [...(current ?? []), ...(following ?? [])];
  const next = nextHoliday(all, today);
  const remaining = (current ?? []).filter((h) => h.date >= today);

  return (
    <div className="mx-auto grid max-w-site grid-cols-1 gap-8 px-4 py-8 md:px-8 md:py-10">
      <header className="grid grid-cols-1 gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-5xl">Feriados {year}</h1>
        <p className="max-w-2xl text-ink-muted">
          Los feriados nacionales y los días no laborables de la Argentina, con el próximo bien a la vista.
        </p>
      </header>

      {next ? (
        <section
          aria-labelledby="proximo-feriado"
          className="grid gap-1 rounded-card border border-rule bg-surface p-5 shadow-card md:p-6"
        >
          <h2 id="proximo-feriado" className="kicker">
            Próximo feriado
          </h2>
          <p className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">{next.name}</p>
          <p className="text-lg first-letter:uppercase">{formatHolidayDate(next.date)}</p>
          <p className="font-semibold">
            {countdown(daysUntil(next.date, today))} · {HOLIDAY_KIND_LABEL[next.kind]}
          </p>
        </section>
      ) : null}

      {current ? (
        <section aria-labelledby="calendario" className="grid gap-4">
          <h2
            id="calendario"
            className="border-t-2 border-ink pt-3 text-sm font-bold tracking-wide uppercase"
          >
            {remaining.length > 0 ? `Lo que queda de ${year}` : `Todos los de ${year}`}
          </h2>
          <ul className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule">
            {(remaining.length > 0 ? remaining : current).map((holiday) => (
              <li
                key={`${holiday.date}-${holiday.name}`}
                className="grid gap-1 bg-surface p-4 sm:grid-cols-[14rem_1fr_auto] sm:items-baseline sm:gap-4"
              >
                <span className="font-semibold first-letter:uppercase">
                  {formatHolidayDate(holiday.date)}
                </span>
                <span>{holiday.name}</span>
                <span className="text-sm text-ink-muted">{HOLIDAY_KIND_LABEL[holiday.kind]}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p role="status" className="rounded-md border border-rule bg-surface px-4 py-3 text-ink-muted">
          No pudimos traer el calendario de feriados en este momento. Probá de nuevo en un rato.
        </p>
      )}

      <p className="text-sm text-ink-subtle">{SOURCE_NOTE}</p>
    </div>
  );
}
