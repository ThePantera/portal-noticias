/**
 * Base de los tests end to end: migraciones desde cero, categorías y un administrador.
 * Corre antes del build (lo llama el webServer de playwright.config.ts) porque el build
 * prerenderiza la portada y las notas leyendo la base.
 */
import { execSync } from "node:child_process";
import "dotenv/config";
import pg from "pg";

export const ADMIN = { email: "e2e@portal.test", name: "Editora E2E", password: "contraseña-e2e-larga" };
/** Secreto del publicador para el servidor de los tests (no es un secreto real). */
export const E2E_CRON_SECRET = "e2e-cron-secret-de-prueba-0123456789abcdef";
export const E2E_ASSISTANT_KEY = "e2e-llave-del-asistente-0123456789abcdef";

export async function resetE2eDatabase() {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) throw new Error("Falta E2E_DATABASE_URL (una base dedicada; su nombre debe terminar en _e2e).");
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith("_e2e"))
    throw new Error(
      `E2E_DATABASE_URL apunta a "${name}": la base se borra, su nombre debe terminar en "_e2e".`,
    );

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await client.end();

  // DATABASE_URL_UNPOOLED también: prisma.config.ts la prefiere y migraría otra base.
  const env = { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: url };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  execSync("npm run db:seed", { env, stdio: "pipe" });
  execSync("npm run admin:create", {
    env: { ...env, ADMIN_EMAIL: ADMIN.email, ADMIN_NAME: ADMIN.name, ADMIN_PASSWORD: ADMIN.password },
    stdio: "pipe",
  });
}
