import "server-only";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { env } from "@/server/env";

/**
 * Almacenamiento de imágenes intercambiable (ADR 0005). La base guarda el nombre del
 * proveedor y la clave de cada archivo, nunca una URL: cambiar de proveedor o poner un
 * CDN delante no obliga a tocar las notas.
 */
export interface StorageDriver {
  readonly name: StorageDriverName;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(keys: string[]): Promise<void>;
  publicUrl(key: string): string;
}

export type StorageDriverName = "local" | "vercel-blob";

export class StorageNotConfiguredError extends Error {}

/** Las claves las arma el servidor; igual se valida que no puedan salir de su carpeta. */
export const SAFE_KEY = /^media\/[a-z0-9][a-z0-9/._-]*$/;

function assertKey(key: string) {
  if (!SAFE_KEY.test(key) || key.includes("..")) throw new Error(`Clave de archivo inválida: ${key}`);
}

/** Disco local, servido por /media/[...key]. Sólo para desarrollo y tests. */
export function localDriver(dir = env.STORAGE_LOCAL_DIR): StorageDriver {
  const root = path.resolve(dir);
  const file = (key: string) => {
    assertKey(key);
    return path.join(root, key);
  };
  return {
    name: "local",
    async put(key, body) {
      const target = file(key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
    },
    async delete(keys) {
      await Promise.all(keys.map((key) => rm(file(key), { force: true })));
    },
    publicUrl: (key) => `${env.MEDIA_PUBLIC_BASE_URL ?? "/media"}/${key.replace(/^media\//, "")}`,
  };
}

/**
 * Credenciales de Vercel Blob. Según cómo se conecte el store, Vercel carga una de dos cosas:
 * - un token `vercel_blob_rw_<storeId>_<secreto>` en BLOB_READ_WRITE_TOKEN (o en otra variable,
 *   si al conectarlo se eligió otro prefijo), o
 * - BLOB_STORE_ID, y la función se autentica sola con el token OIDC que Vercel le da en cada pedido.
 */
export function blobCredentials(source: Record<string, string | undefined> = process.env): {
  token?: string;
  storeId?: string;
} {
  const token =
    source.BLOB_READ_WRITE_TOKEN?.trim() ||
    Object.values(source).find((value) => typeof value === "string" && value.startsWith("vercel_blob_rw_"));
  const rawStoreId = token?.split("_")[3] ?? source.BLOB_STORE_ID?.trim();
  const storeId = rawStoreId?.replace(/^store_/, "") || undefined;
  return { token, storeId };
}

/** Vercel Blob. La dirección pública sale del id del store, así no hay que copiarla a mano. */
export function vercelBlobDriver(credentials = blobCredentials()): StorageDriver {
  const { token, storeId } = credentials;
  const base =
    env.MEDIA_PUBLIC_BASE_URL ??
    (storeId ? `https://${storeId.toLowerCase()}.public.blob.vercel-storage.com` : "");
  // Sin token se pasa el id del store y el SDK usa el token OIDC de Vercel.
  const auth = () => {
    if (token) return { token };
    if (storeId) return { storeId };
    throw new StorageNotConfiguredError("Faltan las credenciales de Vercel Blob.");
  };
  return {
    name: "vercel-blob",
    async put(key, body, contentType) {
      assertKey(key);
      await put(key, body, {
        access: "public",
        ...auth(),
        contentType,
        addRandomSuffix: false,
        // Cada clave es única y nunca se sobrescribe: se puede cachear para siempre.
        cacheControlMaxAge: 31_536_000,
      });
    },
    async delete(keys) {
      if (keys.length)
        await del(
          keys.map((key) => `${base}/${key}`),
          auth(),
        );
    },
    publicUrl: (key) => `${base}/${key}`,
  };
}

/** Proveedor para subir archivos nuevos. */
export function activeDriverName(): StorageDriverName {
  return env.STORAGE_DRIVER ?? (blobCredentials().storeId ? "vercel-blob" : "local");
}

let override: StorageDriver | null = null;

/** Sólo para tests: reemplaza el proveedor. */
export function setStorageDriverForTests(driver: StorageDriver | null) {
  override = driver;
}

export function getStorageDriver(name: string = activeDriverName()): StorageDriver {
  if (override) return override;
  if (name === "vercel-blob") return vercelBlobDriver();
  if (name === "local") return localDriver();
  throw new Error(`Proveedor de almacenamiento desconocido: ${name}`);
}

/** Proveedor para subir, comprobando que sirva en este entorno. */
export function getUploadDriver(): StorageDriver {
  const driver = getStorageDriver();
  // En Vercel el disco se borra en cada deploy: guardar ahí perdería las fotos.
  if (driver.name === "local" && process.env.VERCEL && !override) {
    throw new StorageNotConfiguredError("En Vercel hace falta un Blob store para guardar imágenes.");
  }
  if (driver.name === "vercel-blob" && !blobCredentials().storeId && !override) {
    throw new StorageNotConfiguredError("Faltan BLOB_READ_WRITE_TOKEN o BLOB_STORE_ID.");
  }
  return driver;
}
