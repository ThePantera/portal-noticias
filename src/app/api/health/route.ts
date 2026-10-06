import { connection } from "next/server";

/** Chequeo de vida para el balanceador y el monitoreo. La Fase 3 suma el estado de la base. */
export async function GET() {
  await connection();
  return Response.json(
    { status: "ok", time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
