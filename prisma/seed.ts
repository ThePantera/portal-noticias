/**
 * Seed base: crea las categorías iniciales si no existen. Idempotente.
 * Uso: npm run db:seed
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { INITIAL_CATEGORIES } from "./data/categories";
import { seedCategories } from "./seeders/categories";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

seedCategories(db)
  .then((created) =>
    console.log(`Categorías: ${created} creadas, ${INITIAL_CATEGORIES.length - created} ya existían.`),
  )
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
