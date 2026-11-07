import { connection } from "next/server";
import { validateContact } from "@/lib/contact";
import { clientIp, isSameOrigin } from "@/lib/request";
import { createContactMessage, hashIp } from "@/server/services/contact";

/** POST `{ name, email, message }`: guarda un mensaje del formulario de contacto. */
export async function POST(request: Request) {
  await connection();
  const headers = { "Cache-Control": "no-store" };
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Origen no permitido." }, { status: 403, headers });
  }
  const checked = validateContact(await request.json().catch(() => null));
  if (!checked.ok) return Response.json({ error: checked.error }, { status: 400, headers });
  const ip = clientIp(request);
  const result = await createContactMessage(checked.data, ip ? hashIp(ip) : null);
  if (!result.ok) {
    return Response.json(
      { error: "Recibimos varios mensajes desde tu conexión. Probá de nuevo en un rato." },
      { status: 429, headers },
    );
  }
  return Response.json({ ok: true }, { status: 201, headers });
}
