import type { Metadata } from "next";
import { embedUrl, watchUrl } from "@/lib/live-cams";
import { getPublicLiveCams } from "@/server/services/live-cams";

export const metadata: Metadata = {
  title: "Cámaras en vivo de la Argentina",
  description: "Transmisiones en vivo desde distintos lugares de la Argentina: playas, montañas y ciudades.",
  alternates: { canonical: "/en-vivo" },
};

const NOTE =
  "Son transmisiones públicas de YouTube hechas por terceros: alguna puede cortarse o mostrar una grabación.";

export default async function LiveCamsPage() {
  const cams = await getPublicLiveCams();
  return (
    <div className="mx-auto grid max-w-site grid-cols-1 gap-8 px-4 py-8 md:px-8 md:py-10">
      <header className="grid grid-cols-1 gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-5xl">En vivo</h1>
        <p className="max-w-2xl text-ink-muted">Cámaras en vivo desde distintos lugares de la Argentina.</p>
      </header>
      {cams.length > 0 ? (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {cams.map((cam) => (
            <li key={cam.id} className="grid gap-3">
              <div className="aspect-video overflow-hidden rounded-card border border-rule bg-night">
                <iframe
                  src={embedUrl(cam.youtubeId)}
                  title={`${cam.title}, ${cam.place}`}
                  loading="lazy"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="size-full"
                />
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-bold">{cam.title}</h2>
                <a
                  href={watchUrl(cam.youtubeId)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-ink-muted underline"
                >
                  Ver en YouTube
                </a>
              </div>
              <p className="-mt-2 text-sm text-ink-muted">{cam.place}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p role="status" className="rounded-md border border-rule bg-surface px-4 py-3 text-ink-muted">
          No hay cámaras disponibles en este momento.
        </p>
      )}
      <p className="text-sm text-ink-subtle">{NOTE}</p>
    </div>
  );
}
