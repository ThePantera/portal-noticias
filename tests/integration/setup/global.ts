/**
 * Prepara la base de tests: borra el esquema y aplica todas las migraciones desde cero.
 * Por seguridad, sólo acepta bases cuyo nombre termine en "_test".
 */
import { execSync } from "node:child_process";
import "dotenv/config";
import pg from "pg";

export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url)
    throw new Error(
      "Falta TEST_DATABASE_URL (por ejemplo, postgresql://portal:portal_dev@localhost:5432/portal_test).",
    );
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith("_test")) {
    throw new Error(
      `TEST_DATABASE_URL apunta a "${name}". Los tests borran la base: su nombre tiene que terminar en "_test".`,
    );
  }
  return url;
}

export default async function setup() {
  const url = testDatabaseUrl();
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await client.end();
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
}
