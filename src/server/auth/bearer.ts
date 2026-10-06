import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * ¿La cabecera `Authorization` trae `Bearer <secret>`? Compara en tiempo constante:
 * hashear antes iguala los largos, que timingSafeEqual exige.
 */
export function bearerMatches(header: string | null, secret: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header.slice("Bearer ".length)), digest(secret));
}
