import { z } from "zod";
import type { Airline, Flight, RouteAirport } from "@/types/flights";

/*
 * Vuelos en vivo (ADR 0013). Los datos salen de adsb.lol, una red abierta de receptores ADS-B
 * con licencia ODbL: se pueden mostrar gratis citando la fuente. Acá sólo hay funciones puras
 * (lectura de la respuesta y formatos); el pedido lo hace src/server/services/flights.ts.
 */

/** Centro del mapa: el Obelisco. */
export const FLIGHTS_CENTER = { lat: -34.6037, lon: -58.3816 };

/** Radio de la consulta en millas náuticas (~460 km: de Rosario a Montevideo y Mar del Tuyú). */
export const FLIGHTS_RADIUS_NM = 250;

/** Cada cuánto se vuelven a pedir las posiciones mientras la pestaña está a la vista. */
export const FLIGHTS_REFRESH_MS = 15_000;

export const FLIGHTS_SOURCE = {
  name: "adsb.lol",
  url: "https://adsb.lol",
  license: "ODbL",
  licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
};

export type Airport = { code: string; name: string; lat: number; lon: number };

/** Aeropuertos que se marcan en el mapa como referencia. */
export const AIRPORTS: Airport[] = [
  { code: "AEP", name: "Aeroparque Jorge Newbery", lat: -34.5592, lon: -58.4156 },
  { code: "EZE", name: "Ezeiza (Ministro Pistarini)", lat: -34.8222, lon: -58.5358 },
  { code: "EPA", name: "El Palomar", lat: -34.6099, lon: -58.6126 },
  { code: "FDO", name: "San Fernando", lat: -34.4532, lon: -58.5896 },
  { code: "LPG", name: "La Plata", lat: -34.9722, lon: -57.8947 },
  { code: "ROS", name: "Rosario", lat: -32.9036, lon: -60.785 },
  { code: "MVD", name: "Montevideo (Carrasco)", lat: -34.8384, lon: -56.0308 },
];

const finite = z.number().finite();

const aircraftSchema = z.object({
  hex: z.string().min(1),
  flight: z.string().optional(),
  r: z.string().optional(),
  t: z.string().optional(),
  lat: finite.optional(),
  lon: finite.optional(),
  alt_baro: z.union([finite, z.literal("ground")]).optional(),
  gs: finite.optional(),
  track: finite.optional(),
  true_heading: finite.optional(),
});

const responseSchema = z.object({ ac: z.array(z.unknown()) });

function text(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Lee la respuesta de adsb.lol (`/v2/point/...`). Descarta los aviones sin posición; nunca tira. */
export function parseAdsbLol(json: unknown): Flight[] | null {
  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) return null;
  const flights: Flight[] = [];
  const seen = new Set<string>();
  for (const raw of parsed.data.ac) {
    const ac = aircraftSchema.safeParse(raw);
    if (!ac.success) continue;
    const { lat, lon, alt_baro } = ac.data;
    const id = ac.data.hex.toLowerCase();
    // Los "~" son posiciones sin transpondedor identificable (TIS-B): no tienen identidad estable.
    if (lat === undefined || lon === undefined || id.startsWith("~") || seen.has(id)) continue;
    seen.add(id);
    flights.push({
      id,
      callsign: text(ac.data.flight),
      registration: text(ac.data.r),
      model: text(ac.data.t),
      lat,
      lon,
      altitudeFt: typeof alt_baro === "number" ? Math.round(alt_baro) : alt_baro === "ground" ? 0 : null,
      onGround: alt_baro === "ground",
      speedKt: ac.data.gs ?? null,
      heading: ac.data.track ?? ac.data.true_heading ?? null,
      airline: airlineFromCallsign(text(ac.data.flight)),
    });
  }
  return flights;
}

const integer = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/** "10.668 m" o "En tierra". */
export function formatAltitude(flight: Pick<Flight, "altitudeFt" | "onGround">): string {
  if (flight.onGround) return "En tierra";
  if (flight.altitudeFt === null) return "Sin dato";
  return `${integer.format(flight.altitudeFt * 0.3048)} m`;
}

/** "843 km/h". */
export function formatSpeed(speedKt: number | null): string {
  return speedKt === null ? "Sin dato" : `${integer.format(speedKt * 1.852)} km/h`;
}

const COMPASS = ["norte", "noreste", "este", "sudeste", "sur", "sudoeste", "oeste", "noroeste"];

/** "Rumbo noroeste (309°)". */
export function formatHeading(heading: number | null): string {
  if (heading === null) return "Sin dato";
  const normalized = ((heading % 360) + 360) % 360;
  return `${COMPASS[Math.round(normalized / 45) % 8]} (${Math.round(normalized)}°)`;
}

/** Nombre para mostrar: el indicativo, si no la matrícula, si no el código del transpondedor. */
export function flightLabel(flight: Pick<Flight, "callsign" | "registration" | "id">): string {
  return flight.callsign ?? flight.registration ?? flight.id.toUpperCase();
}

/** En el aire primero, de más alto a más bajo; los que están en tierra al final. */
export function sortFlights(flights: Flight[]): Flight[] {
  return [...flights].sort((a, b) => {
    if (a.onGround !== b.onGround) return a.onGround ? 1 : -1;
    return (b.altitudeFt ?? -1) - (a.altitudeFt ?? -1);
  });
}

/** Aerolíneas que suelen volar sobre Buenos Aires, por código ICAO (las tres letras del indicativo). */
export const AIRLINES: Record<string, string> = {
  ARG: "Aerolíneas Argentinas",
  AUT: "Austral",
  FBZ: "Flybondi",
  JES: "JetSMART",
  JAT: "JetSMART",
  ANS: "Andes Líneas Aéreas",
  FAG: "Fuerza Aérea Argentina",
  LAN: "LATAM",
  LPE: "LATAM Perú",
  LNE: "LATAM Ecuador",
  ARE: "LATAM Colombia",
  TAM: "LATAM Brasil",
  GLO: "Gol",
  AZU: "Azul",
  SKU: "Sky Airline",
  BOV: "Boliviana de Aviación",
  AVA: "Avianca",
  CMP: "Copa Airlines",
  AMX: "Aeroméxico",
  AAL: "American Airlines",
  UAL: "United Airlines",
  DAL: "Delta",
  ACA: "Air Canada",
  IBE: "Iberia",
  AEA: "Air Europa",
  LVL: "Level",
  AFR: "Air France",
  KLM: "KLM",
  DLH: "Lufthansa",
  ITY: "ITA Airways",
  BAW: "British Airways",
  SWR: "Swiss",
  TAP: "TAP Air Portugal",
  THY: "Turkish Airlines",
  UAE: "Emirates",
  QTR: "Qatar Airways",
  ETH: "Ethiopian Airlines",
  FDX: "FedEx",
  UPS: "UPS",
  GTI: "Atlas Air",
  CKS: "Kalitta Air",
};

const AIRLINE_CALLSIGN = /^([A-Z]{3})\d/;

/** "ARG1665" → Aerolíneas Argentinas. Los indicativos que son matrículas ("LVCXS") no tienen aerolínea. */
export function airlineFromCallsign(callsign: string | null): Airline | null {
  const code = callsign ? AIRLINE_CALLSIGN.exec(callsign)?.[1] : undefined;
  return code ? { code, name: AIRLINES[code] ?? null } : null;
}

/** Nombre para mostrar: el conocido o, si no, el código. */
export function airlineName(airline: Airline): string {
  return airline.name ?? `Código ${airline.code}`;
}

/** Sólo se piden rutas de vuelos comerciales: los que tienen indicativo de aerolínea. */
export function hasAirlineCallsign(callsign: string | null): callsign is string {
  return callsign !== null && AIRLINE_CALLSIGN.test(callsign);
}

const routeAirportSchema = z.object({
  iata: z.string().nullish(),
  icao: z.string().min(1),
  location: z.string().nullish(),
  name: z.string().nullish(),
  countryiso2: z.string().nullish(),
});

const routeSchema = z.object({
  callsign: z.string().min(1),
  plausible: z.union([z.boolean(), z.number()]).optional(),
  _airports: z.array(routeAirportSchema).optional(),
});

/**
 * Lee la respuesta de `POST /api/0/routeset` de adsb.lol: indicativo → aeropuertos. Descarta las
 * rutas que adsb.lol marca como no plausibles (no coinciden con dónde está el avión): mejor no
 * mostrar ruta que mostrar una equivocada.
 */
export function parseRouteset(json: unknown): Map<string, RouteAirport[]> {
  const routes = new Map<string, RouteAirport[]>();
  if (!Array.isArray(json)) return routes;
  for (const raw of json) {
    const parsed = routeSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.plausible) continue;
    const airports = (parsed.data._airports ?? []).map((airport) => ({
      iata: airport.iata?.trim() || null,
      icao: airport.icao,
      city: airport.location?.trim() || airport.name?.trim() || airport.icao,
      country: airport.countryiso2?.trim() || "",
    }));
    if (airports.length >= 2) routes.set(parsed.data.callsign.trim(), airports);
  }
  return routes;
}

/** "Bariloche (BRC)". */
export function formatRouteAirport(airport: RouteAirport): string {
  return `${airport.city} (${airport.iata ?? airport.icao})`;
}

/** "BRC → AEP", para la lista. */
export function routeCodes(route: RouteAirport[]): string {
  return route.map((airport) => airport.iata ?? airport.icao).join(" → ");
}
