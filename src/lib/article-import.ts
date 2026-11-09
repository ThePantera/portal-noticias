import type { EditorDoc, EditorNode } from "./content";
import { cleanText } from "./trends";

/**
 * Importar una nota desde el link de otra página: lee los metadatos (Open Graph) y los
 * párrafos del HTML y arma el documento del editor. Funciones puras: la descarga vive en
 * `src/server/services/article-import.ts`.
 */

export type ImportedPage = {
  title: string;
  excerpt: string;
  imageUrl: string | null;
  siteName: string;
  /** Autor de la nota original, si la página lo dice. */
  author: string;
  /** Bloques del cuerpo, en orden. */
  blocks: { type: "paragraph" | "heading"; text: string }[];
  /** Fotos del cuerpo de la nota (sin la principal), para la galería. */
  images: { url: string; alt: string }[];
};

/** Autor de la nota: metadatos o datos estructurados. Nunca una URL. */
function authorOf(html: string): string {
  const fromMeta = metaContent(html, ["author", "article:author", "parsely-author", "sailthru.author"]);
  if (fromMeta && !/^https?:/i.test(fromMeta)) return fromMeta.slice(0, 120);
  const fromJsonLd = html.match(/"author"\s*:\s*\[?\s*\{[^}]*?"name"\s*:\s*"([^"]{2,120})"/)?.[1];
  return fromJsonLd ? cleanText(fromJsonLd) : "";
}

/** Tope de fotos del cuerpo que se traen a la galería. */
export const MAX_IMPORTED_IMAGES = 10;

/** Íconos, logos, avatares y píxeles de seguimiento: no son fotos de la nota. */
const NOT_A_PHOTO = /(logo|icon|avatar|sprite|pixel|placeholder|blank|spacer|badge|emoji|author|autor)/i;

/** La URL más grande de un srcset ("a.jpg 320w, b.jpg 1024w" → b.jpg). */
function largestFromSrcset(srcset: string): string {
  let best = "";
  let bestSize = -1;
  for (const candidate of srcset.split(/,\s+/)) {
    const [url, size = "0"] = candidate.trim().split(/\s+/);
    const value = parseFloat(size) || 0;
    if (url && value >= bestSize) {
      best = url;
      bestSize = value;
    }
  }
  return best;
}

/** Sin la consulta: dos tamaños de la misma foto cuentan como una. */
function photoKey(url: string): string {
  return url.replace(/[?#].*$/, "");
}

/** Fotos dentro del contenedor de la nota, en orden, sin repetir la principal. */
function bodyImages(container: string, base: URL, mainImage: string | null): ImportedPage["images"] {
  const seen = new Set<string>(mainImage ? [photoKey(mainImage)] : []);
  const images: ImportedPage["images"] = [];
  for (const tagHtml of container.match(/<img\b[^>]*>/gi) ?? []) {
    const attrs = attributesOf(tagHtml);
    const width = Number(attrs.width) || 0;
    const height = Number(attrs.height) || 0;
    if ((width && width < 300) || (height && height < 200)) continue;
    const raw =
      largestFromSrcset(attrs.srcset ?? attrs["data-srcset"] ?? "") ||
      attrs["data-src"] ||
      attrs["data-original"] ||
      attrs["data-lazy-src"] ||
      attrs.src ||
      "";
    if (!raw || raw.startsWith("data:") || /\.(svg|gif)(\?|$)/i.test(raw) || NOT_A_PHOTO.test(raw)) continue;
    let url: string;
    try {
      const resolved = new URL(raw.replace(/&amp;/g, "&"), base);
      if (resolved.protocol !== "https:" && resolved.protocol !== "http:") continue;
      url = resolved.toString();
    } catch {
      continue;
    }
    const key = photoKey(url);
    if (seen.has(key)) continue;
    seen.add(key);
    images.push({ url, alt: cleanText(attrs.alt ?? "").slice(0, 200) });
    if (images.length >= MAX_IMPORTED_IMAGES) break;
  }
  return images;
}

/** Atributos de una etiqueta, con las claves en minúscula. */
function attributesOf(tagHtml: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of tagHtml.matchAll(/([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    attrs[match[1].toLowerCase()] = match[3] ?? match[4] ?? "";
  }
  return attrs;
}

/** Contenido del primer <meta> cuyo property o name coincide, en el orden pedido. */
export function metaContent(html: string, keys: string[]): string {
  const metas = (html.match(/<meta\b[^>]*>/gi) ?? []).map(attributesOf);
  for (const key of keys) {
    const found = metas.find((attrs) => (attrs.property ?? attrs.name ?? "").toLowerCase() === key);
    if (found?.content) return cleanText(found.content);
  }
  return "";
}

/** Frases que no son parte de la nota: invitaciones, suscripciones, créditos de la página. */
const JUNK =
  /^(seguí leyendo|segui leyendo|leé también|lee también|mirá también|mira también|te puede interesar|suscrib|newsletter|copyright|©|todos los derechos|publicidad|compartir|comentarios|cargando|más noticias|mas noticias|seguinos)/i;

/** Saca scripts, estilos y zonas que nunca son cuerpo de nota. */
function stripNoise(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|iframe|form|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|header|footer|aside|figcaption)\b[\s\S]*?<\/\1>/gi, " ");
}

/** El <article> más largo, o el <body>, o todo. */
function mainContainer(html: string): string {
  const articles = html.match(/<article\b[\s\S]*?<\/article>/gi) ?? [];
  const longest = articles.sort((a, b) => b.length - a.length)[0];
  if (longest && longest.length > 1500) return longest;
  return html.match(/<body\b[\s\S]*<\/body>/i)?.[0] ?? html;
}

function findArticleBody(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findArticleBody(item);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.articleBody === "string" && record.articleBody.length > 200) return record.articleBody;
    if (record["@graph"]) return findArticleBody(record["@graph"]);
  }
  return null;
}

/** Texto del articleBody de los datos estructurados, si la página lo trae. */
function jsonLdBody(html: string): string | null {
  for (const script of html.match(/<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) ?? []) {
    try {
      const body = findArticleBody(JSON.parse(script.replace(/^<script[^>]*>|<\/script>$/gi, "")));
      if (body) return body;
    } catch {
      // Datos estructurados rotos: se prueba con el siguiente.
    }
  }
  return null;
}

/** Corta un texto largo sin saltos en párrafos de unas tres oraciones. */
function splitIntoParagraphs(text: string): string[] {
  const lines = text
    .split(/\n+/)
    .map((line) => cleanText(line))
    .filter(Boolean);
  if (lines.length > 1) return lines;
  const sentences = cleanText(text).match(/[^.!?]+[.!?]+["”»)]*\s*|[^.!?]+$/g) ?? [];
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(
      sentences
        .slice(i, i + 3)
        .join("")
        .trim(),
    );
  }
  return paragraphs.filter(Boolean);
}

const MAX_BLOCKS = 120;

/** Lee título, bajada, imagen, nombre del sitio y cuerpo de una página de noticias. */
export function parseArticlePage(html: string, url: URL): ImportedPage {
  const hostname = url.hostname.replace(/^www\./, "");
  const title = (
    metaContent(html, ["og:title", "twitter:title"]) ||
    cleanText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "") ||
    cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
  ).slice(0, 200);
  const excerpt = metaContent(html, ["og:description", "twitter:description", "description"]).slice(0, 400);
  const siteName = metaContent(html, ["og:site_name", "application-name"]) || hostname;
  const author = authorOf(html);

  let imageUrl: string | null = null;
  const rawImage = metaContent(html, [
    "og:image:secure_url",
    "og:image",
    "twitter:image",
    "twitter:image:src",
  ]);
  if (rawImage) {
    try {
      const resolved = new URL(rawImage, url);
      if (resolved.protocol === "https:" || resolved.protocol === "http:") imageUrl = resolved.toString();
    } catch {
      // Imagen con dirección rota: la nota se importa sin foto.
    }
  }

  const seen = new Set<string>();
  const blocks: ImportedPage["blocks"] = [];
  const container = mainContainer(stripNoise(html));
  const images = bodyImages(container, url, imageUrl);
  for (const match of container.matchAll(/<(p|h2|h3)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = cleanText(match[2]);
    const isHeading = match[1].toLowerCase() !== "p";
    if (!text || seen.has(text) || JUNK.test(text)) continue;
    if (!isHeading && text.length < 40) continue;
    if (isHeading && (text.length < 4 || text.length > 160)) continue;
    // La bajada suele repetirse como primer párrafo.
    if (text === excerpt || text === title) continue;
    seen.add(text);
    blocks.push({ type: isHeading ? "heading" : "paragraph", text });
  }
  // Un título suelto al final (por ejemplo "Más leídas") no es parte de la nota.
  while (blocks.length && blocks[blocks.length - 1].type === "heading") blocks.pop();

  const paragraphs = blocks.filter((block) => block.type === "paragraph");
  const fromJsonLd = jsonLdBody(html);
  const paragraphChars = paragraphs.reduce((sum, block) => sum + block.text.length, 0);
  if (fromJsonLd && cleanText(fromJsonLd).length > paragraphChars * 1.5) {
    return {
      title,
      excerpt,
      imageUrl,
      siteName,
      author,
      images,
      blocks: splitIntoParagraphs(fromJsonLd)
        .slice(0, MAX_BLOCKS)
        .map((text) => ({ type: "paragraph", text })),
    };
  }
  return { title, excerpt, imageUrl, siteName, author, images, blocks: blocks.slice(0, MAX_BLOCKS) };
}

/**
 * Párrafo final: "Nota original de <autor> en <sitio>. Gracias al aporte de <sitio>.", con
 * enlace a la nota original. Los derechos son de quien la publicó.
 */
export function creditParagraph(siteName: string, url: string, author = ""): EditorNode {
  const italic = { type: "italic" };
  const link = { type: "link", attrs: { href: url } };
  const content: EditorNode[] = [];
  if (author) {
    content.push(
      { type: "text", text: `Nota original de ${author} en `, marks: [italic] },
      { type: "text", text: siteName, marks: [italic, link] },
      { type: "text", text: ". ", marks: [italic] },
    );
  }
  content.push(
    { type: "text", text: "Gracias al aporte de ", marks: [italic] },
    { type: "text", text: siteName, marks: [italic, link] },
    { type: "text", text: ".", marks: [italic] },
  );
  return { type: "paragraph", content };
}

/** Documento del editor con el cuerpo importado y el agradecimiento al final. */
export function importedDoc(page: ImportedPage, url: string): EditorDoc {
  const content: EditorNode[] = page.blocks.map((block) =>
    block.type === "heading"
      ? { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: block.text }] }
      : { type: "paragraph", content: [{ type: "text", text: block.text }] },
  );
  content.push(creditParagraph(page.siteName, url, page.author));
  return { type: "doc", content };
}
