import { z } from "zod";
import type { Flight } from "@/types/flights";

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
    const { hex, lat, lon, alt_baro } = ac.data;
    // Los "~" son posiciones sin transpondedor identificable (TIS-B): no tienen identidad estable.
    if (lat === undefined || lon === undefined || hex.startsWith("~") || seen.has(hex)) continue;
    seen.add(hex);
    flights.push({
      id: hex.toLowerCase(),
      callsign: text(ac.data.flight),
      registration: text(ac.data.r),
      model: text(ac.data.t),
      lat,
      lon,
      altitudeFt: typeof alt_baro === "number" ? Math.round(alt_baro) : alt_baro === "ground" ? 0 : null,
      onGround: alt_baro === "ground",
      speedKt: ac.data.gs ?? null,
      heading: ac.data.track ?? ac.data.true_heading ?? null,
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
