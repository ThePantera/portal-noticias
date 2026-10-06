import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "./config";

// Sólo se pueden usar dentro de Server Actions o Route Handlers.

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, { ...SESSION_COOKIE_OPTIONS, expires: expiresAt });
}

export async function readSessionCookie(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function deleteSessionCookie() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/" });
}
