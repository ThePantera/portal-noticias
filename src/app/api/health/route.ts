import { connection } from "next/server";
import { db } from "@/server/db";

/** Chequeo de vida para el balanceador y el monitoreo. Responde 503 si la base no contesta. */
export async function GET() {
  await connection();
  const headers = { "Cache-Control": "no-store" };
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "ok", time: new Date().toISOString() }, { headers });
  } catch (error) {
    console.error("Health check: la base no responde", error);
    return Response.json({ status: "error", database: "unreachable" }, { status: 503, headers });
  }
}
