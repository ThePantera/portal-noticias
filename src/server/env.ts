import "server-only";
import { z } from "zod";
import { parseGoogleVerification } from "@/lib/seo";

/**
 * Variables de entorno validadas al arrancar. Si falta algo obligatorio,
 * el proceso falla con un mensaje claro en vez de romperse más tarde.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SITE_URL: z.url().default("http://localhost:3000"),
  SITE_NAME: z.string().min(1).default("Portal Noticias"),
  /** Secreto del publicador de programadas. Vacío: el endpoint responde 503. */
  CRON_SECRET: z
    .string()
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => v === undefined || v.length >= 32, "Tiene que tener al menos 32 caracteres."),
  /**
   * Llave del asistente de redacción para /api/assistant/articles (ADR 0008): crea, edita,
   * publica, programa y elimina notas. Vacío: la API responde 503.
   */
  ASSISTANT_API_KEY: z
    .string()
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => v === undefined || v.length >= 32, "Tiene que tener al menos 32 caracteres."),
  /** Código de Google Search Console (método "Etiqueta HTML"). Opcional. */
  GOOGLE_SITE_VERIFICATION: z.string().optional().transform(parseGoogleVerification),
  /**
   * Dónde se guardan las imágenes: "local" (disco, sólo para desarrollo) o "vercel-blob".
   * Vacío: Vercel Blob si está su token, si no el disco.
   */
  STORAGE_DRIVER: z
    .enum(["local", "vercel-blob"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  STORAGE_LOCAL_DIR: z.string().min(1).default("./storage"),
  /** Token de Vercel Blob. Lo carga Vercel al conectar un Blob store al proyecto. */
  BLOB_READ_WRITE_TOKEN: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  /** Base pública de las imágenes, para poner un CDN o dominio propio delante. Opcional. */
  MEDIA_PUBLIC_BASE_URL: z
    .string()
    .optional()
    .transform((v) => v?.replace(/\/+$/, "") || undefined)
    .pipe(z.union([z.url(), z.string().startsWith("/")]).optional()),
});

// En Vercel, si no se definió SITE_URL se usa el dominio de producción del proyecto, para
// que los enlaces canónicos nunca apunten a localhost.
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const parsed = schema.safeParse({
  ...process.env,
  SITE_URL: process.env.SITE_URL || (vercelUrl ? `https://${vercelUrl}` : undefined),
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Variables de entorno inválidas:\n${issues}`);
}

export const env = parsed.data;
