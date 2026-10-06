// Sin "server-only": lo usa también el comando admin:create, que corre fuera de Next.
import { hash, verify } from "@node-rs/argon2";

export const MIN_PASSWORD_LENGTH = 12;

/** Hash argon2id con los parámetros por defecto de @node-rs/argon2 (m=19 MiB, t=2, p=1; mínimo de OWASP). */
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

/** Compara en tiempo constante. Devuelve false ante un hash mal formado, sin lanzar. */
export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Hash de una contraseña aleatoria, para gastar el mismo tiempo cuando el email no existe
// y no revelar qué cuentas hay por la demora de la respuesta.
let dummyHash: Promise<string> | undefined;
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= hash(crypto.randomUUID());
  await verifyPassword(await dummyHash, password);
  return false;
}
