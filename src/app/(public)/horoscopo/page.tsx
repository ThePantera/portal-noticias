import type { Metadata } from "next";
import { ELEMENT_LABEL, ZODIAC_SIGNS } from "@/lib/horoscope";
import { formatHolidayDate } from "@/lib/holidays";
import { getTodayHoroscopes } from "@/server/services/horoscope";

export const metadata: Metadata = {
  title: "Horóscopo de hoy",
  description:
    "El horóscopo del día para los doce signos: amor, trabajo, salud, número y color de la suerte.",
  alternates: { canonical: "/horoscopo" },
};

const ENTERTAINMENT_NOTE =
  "Contenido de entretenimiento. Textos propios combinados según la fecha y el signo; no es una predicción.";

export default async function HoroscopePage() {
  const { today, horoscopes } = await getTodayHoroscopes();

  return (
    <div className="mx-auto grid max-w-site grid-cols-1 gap-8 px-4 py-8 md:px-8 md:py-10">
      <header className="grid grid-cols-1 gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-5xl">Horóscopo de hoy</h1>
        <p className="text-lg first-letter:uppercase">{formatHolidayDate(today)}</p>
      </header>

      <nav aria-label="Signos">
        <ul className="flex flex-wrap gap-2">
          {ZODIAC_SIGNS.map((sign) => (
            <li key={sign.slug}>
              <a
                href={`#${sign.slug}`}
                className="inline-block rounded-md border border-rule bg-surface px-3 py-1.5 text-sm font-semibold hover:border-ink"
              >
                <span aria-hidden="true">{sign.emoji}</span> {sign.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {horoscopes.map(({ sign, love, work, health, luckyNumber, luckyColor }) => (
          <section
            key={sign.slug}
            id={sign.slug}
            aria-labelledby={`signo-${sign.slug}`}
            className="grid scroll-mt-24 content-start gap-3 rounded-card border border-rule bg-surface p-5 shadow-card"
          >
            <header className="grid gap-1">
              <h2 id={`signo-${sign.slug}`} className="font-display text-2xl font-extrabold tracking-tight">
                <span aria-hidden="true">{sign.emoji}</span> {sign.name}
              </h2>
              <p className="text-sm text-ink-muted">
                Del {sign.dates} · {ELEMENT_LABEL[sign.element]}
              </p>
            </header>
            <dl className="grid gap-2">
              <div>
                <dt className="kicker">Amor</dt>
                <dd>{love}</dd>
              </div>
              <div>
                <dt className="kicker">Trabajo</dt>
                <dd>{work}</dd>
              </div>
              <div>
                <dt className="kicker">Salud</dt>
                <dd>{health}</dd>
              </div>
            </dl>
            <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t border-rule pt-2 text-sm">
              <div className="flex gap-1">
                <dt className="font-semibold">Número de la suerte:</dt>
                <dd>{luckyNumber}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-semibold">Color:</dt>
                <dd>{luckyColor}</dd>
              </div>
            </dl>
          </section>
        ))}
      </div>

      <p className="text-sm text-ink-subtle">{ENTERTAINMENT_NOTE}</p>
    </div>
  );
}
