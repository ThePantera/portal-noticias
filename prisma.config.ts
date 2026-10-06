import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // `prisma generate` no necesita la base; las migraciones fallan con un error claro si falta la URL.
  // En Neon, DATABASE_URL pasa por el pooler (PgBouncer), que no sirve para migrar; la
  // integración de Vercel define además DATABASE_URL_UNPOOLED con la conexión directa.
  datasource: { url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "" },
});
