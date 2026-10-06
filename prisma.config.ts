import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // `prisma generate` no necesita la base; las migraciones fallan con un error claro si falta la URL.
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
