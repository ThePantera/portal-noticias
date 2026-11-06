import type { Metadata } from "next";
import { FlightsTracker } from "@/components/flights/FlightsTracker";

export const metadata: Metadata = {
  title: "Vuelos en vivo",
  description:
    "Mapa de los aviones que están volando ahora sobre Buenos Aires, con su altura, velocidad y rumbo, actualizado cada 15 segundos.",
  alternates: { canonical: "/vuelos" },
};

export default function FlightsPage() {
  return (
    <div className="mx-auto grid max-w-site grid-cols-1 gap-8 px-4 py-8 md:px-8 md:py-10">
      <header className="grid grid-cols-1 gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-5xl">Vuelos en vivo</h1>
        <p className="max-w-2xl text-ink-muted">
          Los aviones que están volando ahora sobre Buenos Aires y alrededores, de Aeroparque y Ezeiza al Río
          de la Plata. El mapa se mueve solo cada 15 segundos.
        </p>
      </header>
      <FlightsTracker />
    </div>
  );
}
