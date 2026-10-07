import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { normalizeEmoji } from "@/lib/reactions";
import { getReactionSummary, hashIdentifier, toggleReaction } from "@/server/services/reactions";

/**
 * Reacciones de una nota (ADR 0010). GET: conteo por emoji y cuáles dejó este navegador.
 * POST `{ emoji }`: pone o saca esa reacción. Anónimo: el navegador recibe una cookie
 * propia la primera vez que reacciona.
 */

type Context = RouteContext<"/api/reacciones/[articleId]">;

const VISITOR_COOKIE = "portal_lector";
const NO_STORE = { "Cache-Control": "private, no-store" };

const LIMIT_MESSAGES = {
  "visitor-limit": "Ya dejaste el máximo de reacciones en esta nota.",
  "article-limit": "Esta nota ya tiene demasiados emojis distintos. Probá con uno de los que están.",
  "ip-limit": "Demasiadas reacciones desde tu conexión. Probá de nuevo en un rato.",
} as const;

function clientIp(request: Request): string | null {
  const h = request.headers;
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

/** Sólo desde el propio sitio: frena formularios y scripts de otras páginas. */
function isSameOrigin(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function GET(_request: Request, { params }: Context) {
  await connection();
  const { articleId } = await params;
  const visitor = (await cookies()).get(VISITOR_COOKIE)?.value;
  const summary = await getReactionSummary(articleId, visitor ? hashIdentifier(visitor) : null);
  if (!summary) return Response.json({ error: "La nota no existe." }, { status: 404, headers: NO_STORE });
  return Response.json(summary, { headers: NO_STORE });
}

export async function POST(request: Request, { params }: Context) {
  await connection();
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Origen no permitido." }, { status: 403, headers: NO_STORE });
  }
  const body: unknown = await request.json().catch(() => null);
  const emoji = normalizeEmoji(body && typeof body === "object" && "emoji" in body ? body.emoji : null);
  if (!emoji) return Response.json({ error: "Elegí un solo emoji." }, { status: 400, headers: NO_STORE });

  const { articleId } = await params;
  const jar = await cookies();
  let visitor = jar.get(VISITOR_COOKIE)?.value;
  if (!visitor || visitor.length > 100) {
    visitor = randomBytes(24).toString("base64url");
    jar.set(VISITOR_COOKIE, visitor, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365 * 2,
    });
  }
  const ip = clientIp(request);
  const result = await toggleReaction(articleId, emoji, {
    visitorHash: hashIdentifier(visitor),
    ipHash: ip ? hashIdentifier(ip) : null,
  });
  if (result.ok) return Response.json(result.summary, { headers: NO_STORE });
  if (result.reason === "missing") {
    return Response.json({ error: "La nota no existe." }, { status: 404, headers: NO_STORE });
  }
  return Response.json({ error: LIMIT_MESSAGES[result.reason] }, { status: 429, headers: NO_STORE });
}
