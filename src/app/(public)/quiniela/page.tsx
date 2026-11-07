import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quiniela de la Ciudad y de la Provincia",
  description:
    "Dónde ver los resultados oficiales de la Quiniela de la Ciudad y de la Provincia de Buenos Aires.",
  alternates: { canonical: "/quiniela" },
};

/**
 * Por ahora no mostramos números: no encontramos una fuente pública, estable y con permiso
 * de reproducción que se pueda leer desde el servidor. La página remite a las loterías.
 */
const OFFICIAL_SOURCES = [
  {
    name: "Lotería de la Ciudad de Buenos Aires",
    game: "Quiniela de la Ciudad (ex Quiniela Nacional)",
    href: "https://www.loteriadelaciudad.gob.ar/",
  },
  {
    name: "Lotería de la Provincia de Buenos Aires",
    game: "Quiniela de la Provincia",
    href: "https://www.loteria.gba.gob.ar/",
  },
];

const DRAWS = ["La Previa", "La Primera", "Matutina", "Vespertina", "Nocturna"];

const HOW_TO_READ =
  "En cada sorteo salen 20 números de cuatro cifras, ordenados del 1 al 20. El primero es la «cabeza».";

const SOURCE_NOTE =
  "Los resultados oficiales son los de la lotería: ante cualquier duda, vale el extracto oficial.";

export default function QuinielaPage() {
  return (
    <div className="mx-auto grid max-w-site grid-cols-1 gap-8 px-4 py-8 md:px-8 md:py-10">
      <header className="grid grid-cols-1 gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-5xl">Quiniela</h1>
        <p className="max-w-2xl text-ink-muted">
          Los sorteos del día de la Quiniela de la Ciudad y de la Quiniela de la Provincia de Buenos Aires.
        </p>
      </header>

      <p role="status" className="rounded-md border border-rule bg-surface px-4 py-3 text-ink-muted">
        Los resultados no están disponibles en este momento. Consultalos en la fuente oficial.
      </p>

      <section aria-labelledby="fuentes-oficiales" className="grid gap-4">
        <h2
          id="fuentes-oficiales"
          className="border-t-2 border-ink pt-3 text-sm font-bold tracking-wide uppercase"
        >
          Fuentes oficiales
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {OFFICIAL_SOURCES.map((source) => (
            <li
              key={source.href}
              className="grid gap-1 rounded-card border border-rule bg-surface p-5 shadow-card"
            >
              <p className="kicker">{source.game}</p>
              <a
                href={source.href}
                className="font-display text-xl font-extrabold tracking-tight underline hover:text-accent"
              >
                {source.name}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="extracto" className="grid max-w-2xl gap-3">
        <h2 id="extracto" className="border-t-2 border-ink pt-3 text-sm font-bold tracking-wide uppercase">
          Cómo se lee un extracto
        </h2>
        <p>Los sorteos del día son:</p>
        <ul className="flex flex-wrap gap-2">
          {DRAWS.map((draw) => (
            <li
              key={draw}
              className="rounded-md border border-rule bg-surface px-3 py-1.5 text-sm font-semibold"
            >
              {draw}
            </li>
          ))}
        </ul>
        <p>{HOW_TO_READ}</p>
      </section>

      <p className="text-sm text-ink-subtle">{SOURCE_NOTE}</p>
    </div>
  );
}
