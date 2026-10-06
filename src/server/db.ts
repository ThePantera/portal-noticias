import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta DATABASE_URL. Copiá .env.example a .env y completala.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// En desarrollo, el hot reload reimporta este módulo: reusamos el cliente para no abrir conexiones de más.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
