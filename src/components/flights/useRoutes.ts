"use client";

import { useEffect, useSyncExternalStore } from "react";
import { hasAirlineCallsign, parseRouteset } from "@/lib/flights";
import type { Flight, RouteAirport } from "@/types/flights";

/*
 * Origen y destino de cada vuelo, de la base de rutas de adsb.lol (ODbL). Se piden desde el
 * navegador, sólo para el avión que el lector toca: la API acepta pedidos de cualquier sitio y
 * desde los servidores de Vercel no respondía. Cada indicativo se pide una sola vez por visita.
 */
const ROUTESET = "https://api.adsb.lol/api/0/routeset";

export type RouteState = "loading" | "unknown" | RouteAirport[];

const routes = new Map<string, RouteState>();
const listeners = new Set<() => void>();
let version = 0;

function set(callsign: string, state: RouteState) {
  routes.set(callsign, state);
  version += 1;
  for (const listener of listeners) listener();
}

async function load(flight: Flight & { callsign: string }) {
  set(flight.callsign, "loading");
  try {
    const response = await fetch(ROUTESET, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planes: [{ callsign: flight.callsign, lat: flight.lat, lng: flight.lon }] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    set(flight.callsign, parseRouteset(await response.json()).get(flight.callsign) ?? "unknown");
  } catch {
    // Sin respuesta: se deja de nuevo sin pedir, para reintentar si el lector lo vuelve a tocar.
    routes.delete(flight.callsign);
    version += 1;
    for (const listener of listeners) listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Ruta conocida de un vuelo, si ya se pidió. */
export function routeOf(flight: Flight): RouteState | undefined {
  return flight.callsign ? routes.get(flight.callsign) : undefined;
}

/** Pide la ruta del vuelo elegido y redibuja cuando llega cualquier ruta. Devuelve la del elegido. */
export function useRoute(flight: Flight | null): RouteState | undefined {
  useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
  const callsign = flight?.callsign ?? null;
  useEffect(() => {
    if (!flight || !hasAirlineCallsign(callsign) || routes.has(callsign)) return;
    void load({ ...flight, callsign });
    // Se pide una vez por indicativo; la posición del momento alcanza para que adsb.lol la valide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callsign]);
  if (!flight) return undefined;
  return hasAirlineCallsign(callsign) ? routeOf(flight) : "unknown";
}
