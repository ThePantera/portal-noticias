import "server-only";
import type { Role } from "@/generated/prisma/client";
import { SESSION_TTL_MS } from "@/server/auth/config";
import { generateSessionToken, hashSessionToken } from "@/server/auth/tokens";
import { db } from "@/server/db";

export type SessionUser = { id: string; email: string; name: string; role: Role };

export async function createSession(
  userId: string,
  meta: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({
    data: {
      id: hashSessionToken(token),
      userId,
      expiresAt,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
    },
  });
  return { token, expiresAt };
}

/** Devuelve el usuario de la sesión si el token es válido, no venció y el usuario sigue activo. */
export async function validateSessionToken(token: string): Promise<SessionUser | null> {
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: hashSessionToken(token) },
    include: { user: { select: { id: true, email: true, name: true, role: true, isActive: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now() || !session.user.isActive) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  const { id, email, name, role } = session.user;
  return { id, email, name, role };
}

export async function invalidateSessionToken(token: string): Promise<void> {
  await db.session.deleteMany({ where: { id: hashSessionToken(token) } });
}

export async function invalidateAllSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}
