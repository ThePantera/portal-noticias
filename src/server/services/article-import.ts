import "server-only";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { importedDoc, parseArticlePage } from "@/lib/article-import";
import { MAX_UPLOAD_BYTES } from "@/lib/media";
import type { Actor } from "@/server/permissions";
import { createArticle } from "./article-commands";
import { MediaError, uploadImage } from "./media";

/**
 * Importa una nota desde el link de otra página (panel → "Traer nota desde un link"): lee
 * título, bajada, texto e imagen principal, y la guarda como BORRADOR para revisarla antes
 * de publicar. Al final del cuerpo agrega "Gracias al aporte de <sitio>" con el enlace.
 */

const USER_AGENT = "Mozilla/5.0 (compatible; MeContaron/1.0; +https://portal-noticias-zeta.vercel.app)";
const MAX_HTML_BYTES = 5_000_000;
const MAX_REDIRECTS = 4;

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/** Redes internas: el servidor del sitio no tiene que poder leerlas por este camino. */
const PRIVATE = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["224.0.0.0", 3],
] as const) {
  PRIVATE.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 127],
  ["fc00::", 7],
  ["fe80::", 10],
  ["::ffff:0:0", 96],
] as const) {
  PRIVATE.addSubnet(net, prefix, "ipv6");
}

async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ImportError("El link tiene que empezar con http:// o https://.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: { address: string; family: number }[];
  try {
    addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true });
  } catch {
    throw new ImportError("No se encontró esa página. Revisá el link.");
  }
  for (const { address, family } of addresses) {
    if (PRIVATE.check(address, family === 6 ? "ipv6" : "ipv4")) {
      throw new ImportError("Ese link no apunta a una página pública.");
    }
  }
}

/** Descarga siguiendo redirecciones a mano, revisando cada salto. */
async function fetchPublic(
  raw: string,
  accept: string,
  maxBytes: number,
): Promise<{ url: URL; body: Buffer; type: string }> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new ImportError("El link no es válido. Copialo completo desde la barra del navegador.");
  }
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: accept, "Accept-Language": "es-AR,es;q=0.9" },
        signal: AbortSignal.timeout(12_000),
        redirect: "manual",
        cache: "no-store",
      });
    } catch {
      throw new ImportError("La página no respondió. Probá de nuevo en un rato.");
    }
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) throw new ImportError(`La página respondió con un error (${response.status}).`);
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > maxBytes) throw new ImportError("El archivo es demasiado grande.");
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > maxBytes) throw new ImportError("El archivo es demasiado grande.");
    return { url, body, type: response.headers.get("content-type") ?? "" };
  }
  throw new ImportError("La página redirige demasiadas veces.");
}

/** Baja la foto principal y la sube al portal. Si no se puede, la nota sigue sin foto. */
async function importImage(actor: Actor, imageUrl: string): Promise<string | null> {
  try {
    const { body, type } = await fetchPublic(imageUrl, "image/avif,image/webp,image/*", MAX_UPLOAD_BYTES);
    if (type && !type.startsWith("image/")) return null;
    return (await uploadImage(actor, body)).id;
  } catch (error) {
    if (!(error instanceof ImportError || error instanceof MediaError)) {
      console.error("Importar nota: no se pudo traer la imagen", error);
    }
    return null;
  }
}

export type ImportResult = { id: string; hasImage: boolean; blocks: number };

/** Lee la página del link y crea la nota como borrador en la sección elegida. */
export async function importArticleFromUrl(
  actor: Actor,
  rawUrl: string,
  categoryId: string,
): Promise<ImportResult> {
  const { url, body, type } = await fetchPublic(rawUrl, "text/html,application/xhtml+xml", MAX_HTML_BYTES);
  if (type && !/html|xml/i.test(type)) throw new ImportError("El link no es una página de noticias.");
  const page = parseArticlePage(body.toString("utf8"), url);
  if (!page.title) throw new ImportError("No se encontró el título de la nota en esa página.");
  if (page.blocks.length === 0) {
    throw new ImportError("No se encontró el texto de la nota. Puede que la página lo cargue de otra forma.");
  }

  const mainImageId = page.imageUrl ? await importImage(actor, page.imageUrl) : null;
  const article = await createArticle(
    actor,
    {
      title: page.title,
      excerpt: page.excerpt,
      content: importedDoc(page, url.toString()),
      categoryId,
      mainImageId: mainImageId ?? "",
      mainImageAlt: mainImageId ? page.title.slice(0, 200) : "",
      mainImageCredit: mainImageId ? `Foto: ${page.siteName}`.slice(0, 120) : undefined,
    },
    { origin: "IMPORTED" },
  );
  return { id: article.id, hasImage: Boolean(mainImageId), blocks: page.blocks.length };
}
