import { connection } from "next/server";
import { db } from "@/server/db";
import { countOverdueScheduled } from "@/server/services/articles";

/** Chequeo de vida para el balanceador y el monitoreo. Responde 503 si la base no contesta. */
export async function GET() {
  await connection();
  const headers = { "Cache-Control": "no-store" };
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("Health check: la base no responde", error);
    return Response.json({ status: "error", database: "unreachable" }, { status: 503, headers });
  }

  // Programadas que pasaron su hora hace más de 5 minutos: si hay, el cron no está corriendo.
  // Es informativo: si falla (por ejemplo, una base recién creada sin migrar) no tumba el chequeo.
  let overdue: number | null = null;
  try {
    overdue = await countOverdueScheduled(new Date(Date.now() - 5 * 60_000));
  } catch (error) {
    console.error("Health check: no se pudo contar las programadas atrasadas", error);
  }

  return Response.json(
    {
      status: "ok",
      database: "ok",
      scheduler: overdue === null ? "unknown" : overdue > 0 ? "late" : "ok",
      overdueScheduled: overdue,
      time: new Date().toISOString(),
    },
    { headers },
  );
}
