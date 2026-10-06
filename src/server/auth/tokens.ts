import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** Token de sesión: 32 bytes aleatorios en base64url. Sólo viaja en la cookie. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Lo que se guarda en la base: SHA-256 del token. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
