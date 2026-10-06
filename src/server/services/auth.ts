import "server-only";
import { z } from "zod";
import { LOGIN_LIMITS } from "@/server/auth/config";
import { verifyAgainstDummy, verifyPassword } from "@/server/auth/password";
import { db } from "@/server/db";
import { createSession, type SessionUser } from "./sessions";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Ingresá un email válido." })),
  password: z.string().min(1, { error: "Ingresá tu contraseña." }).max(200),
});

export type LoginResult =
  | { ok: true; user: SessionUser; token: string; expiresAt: Date }
  | { ok: false; reason: "invalid" | "blocked" };

async function isBlocked(email: string, ipAddress: string | null): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_LIMITS.windowMs);
  // Por email cuentan los fallos desde el último acceso correcto dentro de la ventana.
  const lastSuccess = await db.loginAttempt.findFirst({
    where: { email, success: true, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });
  const emailFailures = await db.loginAttempt.count({
    where: { email, success: false, createdAt: { gte: lastSuccess?.createdAt ?? since } },
  });
  if (emailFailures >= LOGIN_LIMITS.maxFailuresPerEmail) return true;
  if (!ipAddress) return false;
  const ipFailures = await db.loginAttempt.count({
    where: { ipAddress, success: false, createdAt: { gte: since } },
  });
  return ipFailures >= LOGIN_LIMITS.maxFailuresPerIp;
}

/**
 * Verifica credenciales y crea la sesión. No toca cookies: eso lo hace la Server Action.
 * Ante cualquier fallo devuelve el mismo resultado ("invalid"), exista o no el email.
 */
export async function login(
  input: { email: string; password: string },
  meta: { ipAddress: string | null; userAgent: string | null },
): Promise<LoginResult> {
  const { email, password } = input;
  if (await isBlocked(email, meta.ipAddress)) return { ok: false, reason: "blocked" };

  const user = await db.user.findUnique({ where: { email } });
  const valid = user ? await verifyPassword(user.passwordHash, password) : await verifyAgainstDummy(password);
  const success = Boolean(user && user.isActive && valid);

  await db.loginAttempt.create({ data: { email, ipAddress: meta.ipAddress, success } });
  if (!user || !success) return { ok: false, reason: "invalid" };

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const session = await createSession(user.id, meta);
  return {
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    ...session,
  };
}
