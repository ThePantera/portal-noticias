import { connection } from "next/server";
import { getFlights } from "@/server/services/flights";

/**
 * Vuelos en vivo para el mapa de /vuelos, que los vuelve a pedir cada 15 segundos.
 * La CDN guarda la respuesta 10 segundos: adsb.lol recibe pocos pedidos aunque haya muchos lectores.
 */
export async function GET() {
  await connection();
  const snapshot = await getFlights();
  return Response.json(snapshot, {
    status: snapshot ? 200 : 503,
    headers: {
      "Cache-Control": snapshot
        ? "public, max-age=5, s-maxage=10, stale-while-revalidate=20"
        : "public, max-age=5, s-maxage=5",
    },
  });
}
