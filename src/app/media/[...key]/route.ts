import { readFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { env } from "@/server/env";
import { SAFE_KEY } from "@/server/media/storage";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

/**
 * Sirve las imágenes guardadas en disco (STORAGE_DRIVER="local"), para desarrollo y tests.
 * Con Vercel Blob las imágenes salen directo de su CDN y esta ruta no se usa.
 */
export async function GET(_request: Request, { params }: RouteContext<"/media/[...key]">) {
  await connection();
  const key = `media/${(await params).key.join("/")}`;
  const type = TYPES[path.extname(key)];
  if (!type || !SAFE_KEY.test(key) || key.includes("..")) return new Response(null, { status: 404 });
  try {
    const body = await readFile(path.join(path.resolve(env.STORAGE_LOCAL_DIR), key));
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": type,
        // Cada archivo tiene una clave única que nunca se reescribe.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
