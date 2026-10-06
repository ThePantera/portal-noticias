import "server-only";
import { z } from "zod";

/**
 * Variables de entorno validadas al arrancar. Si falta algo obligatorio,
 * el proceso falla con un mensaje claro en vez de romperse más tarde.
 * Las variables de base de datos, sesiones, cron y media se suman en sus fases.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SITE_URL: z.url().default("http://localhost:3000"),
  SITE_NAME: z.string().min(1).default("Portal Noticias"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Variables de entorno inválidas:\n${issues}`);
}

export const env = parsed.data;
