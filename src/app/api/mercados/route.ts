import { connection } from "next/server";
import { getMarkets } from "@/server/services/markets";

/**
 * Bolsas y criptomonedas para la sección Mercados, que las vuelve a pedir cada media hora.
 * Sale de la misma caché que usa la página, así que no multiplica las consultas a las fuentes.
 */
export async function GET() {
  await connection();
  const markets = await getMarkets();
  return Response.json(markets, {
    status: markets ? 200 : 503,
    headers: { "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=600" },
  });
}
