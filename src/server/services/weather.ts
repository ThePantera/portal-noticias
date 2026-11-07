import "server-only";
import { cacheLife } from "next/cache";
import { CITIES, openMeteoUrl, parseOpenMeteo, type CityWeather } from "@/lib/weather";

/** Open-Meteo actualiza la medición cada 15 minutos: con media hora alcanza para un diario. */
const HALF_HOUR = { stale: 300, revalidate: 1800, expire: 3600 };

/**
 * Clima de todas las ciudades, de Open-Meteo, en un solo pedido. Se guarda en caché media
 * hora: todas las visitas comparten la consulta. Si la fuente falla, tira un error (que no
 * queda en caché, así el próximo pedido vuelve a probar).
 */
async function fetchWeather(): Promise<CityWeather[]> {
  "use cache";
  cacheLife(HALF_HOUR);
  const response = await fetch(openMeteoUrl(CITIES), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const weather = parseOpenMeteo(await response.json(), CITIES);
  if (!weather) throw new Error("formato inesperado");
  return weather;
}

/** Clima de las ciudades (Buenos Aires primero), o null si la fuente no respondió. */
export async function getWeather(): Promise<CityWeather[] | null> {
  try {
    return await fetchWeather();
  } catch (error) {
    console.error("Clima: Open-Meteo no respondió bien", error);
    return null;
  }
}
