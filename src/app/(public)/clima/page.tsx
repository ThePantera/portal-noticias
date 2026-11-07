import type { Metadata } from "next";
import {
  WEATHER_SOURCE,
  describeWeather,
  formatForecastDay,
  formatObservedTime,
  formatTemperature,
} from "@/lib/weather";
import { getWeather } from "@/server/services/weather";

export const metadata: Metadata = {
  title: "Clima en Argentina hoy",
  description:
    "El tiempo ahora en Buenos Aires, Córdoba, Rosario, Mendoza y otras ciudades del país, con el pronóstico de los próximos días.",
  alternates: { canonical: "/clima" },
};

export default async function WeatherPage() {
  const weather = await getWeather();
  const observedAt = weather?.[0]?.observedAt;

  return (
    <div className="mx-auto grid max-w-site grid-cols-1 gap-8 px-4 py-8 md:px-8 md:py-10">
      <header className="grid grid-cols-1 gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-5xl">
          Clima en Argentina
        </h1>
        <p className="max-w-2xl text-ink-muted">
          La temperatura ahora en las principales ciudades del país y el pronóstico de los próximos días.
          {observedAt ? (
            <>
              {" "}
              Actualizado a las <time dateTime={observedAt}>{formatObservedTime(observedAt)}</time>.
            </>
          ) : null}
        </p>
      </header>

      {weather ? (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {weather.map(({ city, temperature, code, isDay, daily }) => {
            const now = describeWeather(code, isDay);
            const [today, ...next] = daily;
            return (
              <li key={city.id} className="rounded-card border border-rule bg-surface p-5 shadow-card">
                <section aria-labelledby={`clima-${city.id}`} className="grid gap-4">
                  <div className="flex items-center gap-4">
                    <span aria-hidden="true" className="text-5xl leading-none">
                      {now.icon}
                    </span>
                    <div className="min-w-0">
                      <h2 id={`clima-${city.id}`} className="font-display text-xl font-bold">
                        {city.name}
                      </h2>
                      <p className="font-display text-4xl leading-none font-bold tabular-nums">
                        {formatTemperature(temperature)}
                      </p>
                      <p className="mt-1 text-sm">{now.label}</p>
                      {today ? (
                        <p className="text-xs text-ink-subtle tabular-nums">
                          Máx. {formatTemperature(today.max)} · Mín. {formatTemperature(today.min)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {next.length > 0 ? (
                    <table className="w-full text-sm">
                      <caption className="sr-only">Pronóstico para {city.name}</caption>
                      <thead className="sr-only">
                        <tr>
                          <th scope="col">Día</th>
                          <th scope="col">Estado</th>
                          <th scope="col">Máxima</th>
                          <th scope="col">Mínima</th>
                        </tr>
                      </thead>
                      <tbody>
                        {next.map((day, i) => {
                          const forecast = describeWeather(day.code);
                          return (
                            <tr key={day.date} className="border-t border-rule">
                              <th
                                scope="row"
                                className="py-1.5 text-left font-semibold first-letter:uppercase"
                              >
                                {i === 0 ? "Mañana" : formatForecastDay(day.date)}
                              </th>
                              <td className="py-1.5 text-center">
                                <span aria-hidden="true">{forecast.icon}</span>
                                <span className="sr-only">{forecast.label}</span>
                              </td>
                              <td className="py-1.5 text-right font-semibold tabular-nums">
                                {formatTemperature(day.max)}
                              </td>
                              <td className="py-1.5 text-right text-ink-muted tabular-nums">
                                {formatTemperature(day.min)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : null}
                </section>
              </li>
            );
          })}
        </ul>
      ) : (
        <p role="status" className="rounded-md border border-rule bg-surface px-4 py-3 text-ink-muted">
          No pudimos traer el clima en este momento. Probá de nuevo en un rato.
        </p>
      )}

      <p className="text-sm text-ink-subtle">
        Datos:{" "}
        <a href={WEATHER_SOURCE.url} className="underline hover:text-ink" rel="noopener">
          {WEATHER_SOURCE.name}
        </a>{" "}
        (licencia CC BY 4.0). Los pronósticos son estimaciones de modelos meteorológicos; ante alertas, vale
        lo que informe el Servicio Meteorológico Nacional.
      </p>
    </div>
  );
}
