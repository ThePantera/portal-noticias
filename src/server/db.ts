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

// El cliente se crea en el primer uso, no al importar el módulo: así `next build` puede
// analizar las rutas sin una base configurada. En desarrollo el hot reload reimporta este
// módulo, por eso se guarda en globalThis y no se abren conexiones de más.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    // El cliente real es el receptor: sus getters y métodos internos necesitan `this`.
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
