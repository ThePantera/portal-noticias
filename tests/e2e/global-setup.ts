/** Prepara la base de los tests end to end: migraciones desde cero, categorías y un administrador. */
import { execSync } from "node:child_process";
import "dotenv/config";
import pg from "pg";

export const ADMIN = { email: "e2e@portal.test", name: "Editora E2E", password: "contraseña-e2e-larga" };

export default async function globalSetup() {
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

  const env = { ...process.env, DATABASE_URL: url };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  execSync("npm run db:seed", { env, stdio: "pipe" });
  execSync("npm run admin:create", {
    env: { ...env, ADMIN_EMAIL: ADMIN.email, ADMIN_NAME: ADMIN.name, ADMIN_PASSWORD: ADMIN.password },
    stdio: "pipe",
  });
}
