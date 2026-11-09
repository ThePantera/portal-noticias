import "server-only";
import {
  FLIGHTS_CENTER,
  FLIGHTS_RADIUS_NM,
  hasAirlineCallsign,
  parseAdsbLol,
  parseRouteset,
} from "@/lib/flights";
import type { Flight, FlightsSnapshot, RouteAirport } from "@/types/flights";

const ENDPOINT = `https://api.adsb.lol/v2/point/${FLIGHTS_CENTER.lat}/${FLIGHTS_CENTER.lon}/${FLIGHTS_RADIUS_NM}`;
const ROUTESET = "https://api.adsb.lol/api/0/routeset";
const HEADERS = { Accept: "application/json", "User-Agent": "MeContaron (portal de noticias)" };

/**
 * Rutas ya consultadas, por indicativo. Un vuelo no cambia de ruta mientras está en el aire, así
 * que con una hora alcanza; vive en la memoria de cada instancia del servidor y sólo ahorra pedidos.
 */
const ROUTE_TTL_MS = 60 * 60_000;
const routeCache = new Map<string, { route: RouteAirport[] | null; at: number }>();

/** Completa origen y destino con la base de rutas de adsb.lol. Si no responde, los vuelos van sin ruta. */
async function withRoutes(flights: Flight[]): Promise<Flight[]> {
  const now = Date.now();
  for (const [callsign, entry] of routeCache) {
    if (now - entry.at > ROUTE_TTL_MS) routeCache.delete(callsign);
  }
  const missing: { callsign: string; lat: number; lng: number }[] = [];
  for (const { callsign, lat, lon } of flights) {
    if (hasAirlineCallsign(callsign) && !routeCache.has(callsign)) missing.push({ callsign, lat, lng: lon });
  }
  if (missing.length > 0) {
    try {
      const response = await fetch(ROUTESET, {
        method: "POST",
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ planes: missing }),
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const routes = parseRouteset(await response.json());
      for (const { callsign } of missing) {
        routeCache.set(callsign, { route: routes.get(callsign) ?? null, at: now });
      }
    } catch (error) {
      console.error("Vuelos: la base de rutas de adsb.lol no respondió bien", error);
    }
  }
  return flights.map((flight) => {
    const cached = flight.callsign ? routeCache.get(flight.callsign) : undefined;
    return cached?.route ? { ...flight, route: cached.route } : flight;
  });
}

/**
 * Posiciones actuales alrededor de Buenos Aires, con aerolínea y ruta cuando se conocen. Sin caché
 * propia para las posiciones: la respuesta de /api/vuelos queda unos segundos en la CDN, así que a
 * adsb.lol llega un pedido cada tanto aunque haya muchos lectores mirando el mapa.
 */
export async function getFlights(): Promise<FlightsSnapshot | null> {
  try {
    const response = await fetch(ENDPOINT, {
      headers: HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const flights = parseAdsbLol(await response.json());
    if (!flights) throw new Error("respuesta con otro formato");
    return { fetchedAt: new Date().toISOString(), flights: await withRoutes(flights) };
  } catch (error) {
    console.error("Vuelos: adsb.lol no respondió bien", error);
    return null;
  }
}
