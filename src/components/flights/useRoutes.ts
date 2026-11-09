"use client";

import { useEffect, useSyncExternalStore } from "react";
import { hasAirlineCallsign, isPlausibleRoute, parseAdsbdbRoute } from "@/lib/flights";
import type { Flight, RouteAirport } from "@/types/flights";

/*
 * Origen y destino de cada vuelo, de la base pública de rutas de adsbdb.com. Se piden desde el
 * navegador, sólo para el avión que el lector toca: adsbdb acepta pedidos de cualquier sitio
 * (adsb.lol no, y desde los servidores de Vercel no respondía). Cada indicativo se pide una vez
 * por visita; si falla, la ficha ofrece reintentar.
 */
const ROUTES_API = "https://api.adsbdb.com/v0/callsign/";

/** "unknown": la base no tiene ruta (o no coincide con dónde está el avión). "error": no respondió. */
export type RouteState = "loading" | "unknown" | "error" | RouteAirport[];

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
    const response = await fetch(ROUTES_API + encodeURIComponent(flight.callsign), {
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404) return set(flight.callsign, "unknown");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const route = parseAdsbdbRoute(await response.json());
    set(flight.callsign, route && isPlausibleRoute(route, flight) ? route : "unknown");
  } catch {
    set(flight.callsign, "error");
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

/** Vuelve a pedir una ruta que no llegó. */
export function retryRoute(flight: Flight) {
  if (hasAirlineCallsign(flight.callsign)) void load({ ...flight, callsign: flight.callsign });
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
    if (!flight || !hasAirlineCallsign(callsign)) return;
    const state = routes.get(callsign);
    if (state !== undefined && state !== "error") return;
    void load({ ...flight, callsign });
    // Se pide una vez por indicativo (o de nuevo si falló); la posición del momento alcanza para validarla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callsign]);
  if (!flight) return undefined;
  return hasAirlineCallsign(callsign) ? routeOf(flight) : "unknown";
}
