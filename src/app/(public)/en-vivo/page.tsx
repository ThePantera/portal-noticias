import type { Metadata } from "next";
import { LiveCamsGrid } from "@/components/editorial/LiveCamsGrid";
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
      <LiveCamsGrid cams={cams} />
      <p className="text-sm text-ink-subtle">{NOTE}</p>
    </div>
  );
}
