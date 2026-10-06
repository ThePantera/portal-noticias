import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { can, type Action } from "@/server/permissions";
import { validateSessionToken, type SessionUser } from "@/server/services/sessions";
import { SESSION_COOKIE } from "./config";

/** Usuario de la sesión actual, validado contra la base. Se resuelve una vez por request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token);
});

/** Exige sesión. Usar en cada página, Server Action y Route Handler del panel. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** Exige sesión y permiso. Sin permiso responde 404 para no revelar qué existe. */
export async function requirePermission(
  action: Action,
  resource?: { ownerId: string },
): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, action, resource)) notFound();
  return user;
}
