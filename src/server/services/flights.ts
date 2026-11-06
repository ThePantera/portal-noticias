import "server-only";
import { FLIGHTS_CENTER, FLIGHTS_RADIUS_NM, parseAdsbLol } from "@/lib/flights";
import type { FlightsSnapshot } from "@/types/flights";

const ENDPOINT = `https://api.adsb.lol/v2/point/${FLIGHTS_CENTER.lat}/${FLIGHTS_CENTER.lon}/${FLIGHTS_RADIUS_NM}`;

/**
 * Posiciones actuales alrededor de Buenos Aires. Sin caché propia: la respuesta de
 * /api/vuelos queda unos segundos en la CDN, así que a adsb.lol llega un pedido cada tanto
 * aunque haya muchos lectores mirando el mapa.
 */
export async function getFlights(): Promise<FlightsSnapshot | null> {
  try {
    const response = await fetch(ENDPOINT, {
      headers: { Accept: "application/json", "User-Agent": "MeContaron (portal de noticias)" },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const flights = parseAdsbLol(await response.json());
    if (!flights) throw new Error("respuesta con otro formato");
    return { fetchedAt: new Date().toISOString(), flights };
  } catch (error) {
    console.error("Vuelos: adsb.lol no respondió bien", error);
    return null;
  }
}
