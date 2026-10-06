/**
 * Seed de contenido de ejemplo para desarrollo (notas ficticias en todos los estados).
 * No corre con NODE_ENV=production. Idempotente.
 * Uso: npm run db:seed && npm run db:seed:demo
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEMO_ARTICLES } from "./data/demo-articles";
import { seedDemo } from "./seeders/demo";

if (process.env.NODE_ENV === "production") {
  console.error("El seed de demo no corre en producción.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

seedDemo(db)
  .then((created) =>
    console.log(`Notas de demo: ${created} creadas, ${DEMO_ARTICLES.length - created} ya existían.`),
  )
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
