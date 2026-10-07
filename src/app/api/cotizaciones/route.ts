import { connection } from "next/server";
import { getDollarRates } from "@/server/services/exchange-rates";

/**
 * Cotizaciones del dólar para el ticker del sitio, que las vuelve a pedir cada minuto.
 * Sale de la misma caché que usan las páginas, así que no multiplica las consultas a la fuente.
 */
export async function GET() {
  await connection();
  const rates = await getDollarRates();
  return Response.json(rates, {
    status: rates ? 200 : 503,
    headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=60" },
  });
}
