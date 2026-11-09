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
  /** Bloques del cuerpo, en orden. */
  blocks: { type: "paragraph" | "heading"; text: string }[];
};

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
      blocks: splitIntoParagraphs(fromJsonLd)
        .slice(0, MAX_BLOCKS)
        .map((text) => ({ type: "paragraph", text })),
    };
  }
  return { title, excerpt, imageUrl, siteName, blocks: blocks.slice(0, MAX_BLOCKS) };
}

/** Párrafo final: "Gracias al aporte de <sitio>", con enlace a la nota original. */
export function creditParagraph(siteName: string, url: string): EditorNode {
  return {
    type: "paragraph",
    content: [
      { type: "text", text: "Gracias al aporte de ", marks: [{ type: "italic" }] },
      {
        type: "text",
        text: siteName,
        marks: [{ type: "italic" }, { type: "link", attrs: { href: url } }],
      },
      { type: "text", text: ".", marks: [{ type: "italic" }] },
    ],
  };
}

/** Documento del editor con el cuerpo importado y el agradecimiento al final. */
export function importedDoc(page: ImportedPage, url: string): EditorDoc {
  const content: EditorNode[] = page.blocks.map((block) =>
    block.type === "heading"
      ? { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: block.text }] }
      : { type: "paragraph", content: [{ type: "text", text: block.text }] },
  );
  content.push(creditParagraph(page.siteName, url));
  return { type: "doc", content };
}
