import Link from "next/link";
import {
  HOME_CITY_IDS,
  WEATHER_SOURCE,
  describeWeather,
  formatObservedTime,
  formatTemperature,
  type CityWeather,
} from "@/lib/weather";

/**
 * Recuadro "Clima" de la portada: Buenos Aires grande y unas pocas ciudades más, con enlace al
 * pronóstico completo. Si Open-Meteo no respondió, no se muestra.
 */
export function WeatherPanel({ weather }: { weather: CityWeather[] | null }) {
  const main = weather?.[0];
  if (!weather || !main) return null;
  const others = weather.filter((w) => HOME_CITY_IDS.includes(w.city.id));
  const condition = describeWeather(main.code, main.isDay);
  const today = main.daily[0];

  return (
    <section aria-labelledby="clima" className="rounded-card border border-rule bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 id="clima" className="text-sm font-bold tracking-wide uppercase">
          Clima
        </h2>
        <p className="text-xs text-ink-subtle">
          Actualizado a las <time dateTime={main.observedAt}>{formatObservedTime(main.observedAt)}</time>
        </p>
      </div>

      <div className="mt-4 flex items-center gap-4 rounded-xl bg-surface-muted p-3">
        <span aria-hidden="true" className="text-5xl leading-none">
          {condition.icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{main.city.name}</p>
          <p className="mt-1 font-display text-4xl leading-none font-bold tabular-nums">
            {formatTemperature(main.temperature)}
          </p>
          <p className="mt-1.5 text-sm">{condition.label}</p>
          {today ? (
            <p className="text-xs text-ink-subtle tabular-nums">
              Máx. {formatTemperature(today.max)} · Mín. {formatTemperature(today.min)}
            </p>
          ) : null}
        </div>
      </div>

      {others.length > 0 ? (
        <ul className="mt-4 grid divide-y divide-rule text-sm">
          {others.map((city) => {
            const { icon, label } = describeWeather(city.code, city.isDay);
            return (
              <li key={city.city.id} className="flex items-center gap-3 py-1.5">
                <span className="min-w-0 flex-1 font-semibold">{city.city.name}</span>
                <span aria-hidden="true">{icon}</span>
                <span className="sr-only">{label}</span>
                <span className="w-10 text-right font-semibold tabular-nums">
                  {formatTemperature(city.temperature)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-3 text-xs text-ink-subtle">
        <Link href="/clima" className="font-semibold text-ink underline hover:text-accent">
          Pronóstico extendido
        </Link>
        <p>
          Datos:{" "}
          <a href={WEATHER_SOURCE.url} className="underline hover:text-ink" rel="noopener">
            {WEATHER_SOURCE.name}
          </a>
        </p>
      </div>
    </section>
  );
}
