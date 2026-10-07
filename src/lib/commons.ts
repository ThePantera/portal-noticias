/**
 * Fotos de Wikimedia Commons para el asistente de redacción (ADR 0009). Funciones puras:
 * interpretan la respuesta de la API de Commons, dejan pasar sólo licencias que permiten
 * publicar con crédito y arman ese crédito.
 */

export const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
/** Las descargas sólo pueden salir de acá: el resto de las direcciones se rechaza. */
export const COMMONS_UPLOAD_HOST = "upload.wikimedia.org";
/** Ancho de la copia que se descarga; el sitio después genera sus propios tamaños. */
export const COMMONS_WIDTH = 1600;

export type CommonsPhoto = {
  /** Título del archivo, por ejemplo "File:Obelisco de Buenos Aires.jpg". */
  title: string;
  pageUrl: string;
  /** Copia de COMMONS_WIDTH px en upload.wikimedia.org. */
  imageUrl: string;
  width: number;
  height: number;
  license: string;
  licenseUrl: string | null;
  author: string;
  description: string;
  /** Crédito listo para la nota: "Autor / Wikimedia Commons, Licencia". */
  credit: string;
};

const MIME_OK = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Licencias aceptadas: dominio público, CC0, CC BY y CC BY-SA (cualquier versión). Las
 * cláusulas NC (no comercial) y ND (sin derivadas) quedan afuera.
 */
export function isAllowedLicense(shortName: string): boolean {
  const name = shortName.trim().toLowerCase();
  if (/\b(nc|nd)\b/.test(name)) return false;
  if (name === "cc0" || name.startsWith("cc0 ")) return true;
  if (name.startsWith("public domain") || name === "pd" || name.startsWith("pd-")) return true;
  return /^cc[ -]by(-sa)?( \d(\.\d)?)?( [a-z-]+)?$/.test(name);
}

/** Texto plano a partir del HTML que trae Commons en autor y descripción. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Crédito de hasta `max` caracteres; si no entra, se acorta el autor. */
export function buildCredit(author: string, license: string, max = 120): string {
  const tail = ` / Wikimedia Commons, ${license}`;
  const name = author || "Autor desconocido";
  const room = max - tail.length;
  const shortName = name.length > room ? `${name.slice(0, Math.max(room - 1, 1)).trimEnd()}…` : name;
  return `${shortName}${tail}`.slice(0, max);
}

type Meta = Record<string, { value?: unknown } | undefined>;
type ImageInfo = {
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
  descriptionurl?: string;
  mime?: string;
  extmetadata?: Meta;
};
type Page = { title?: string; index?: number; imageinfo?: ImageInfo[] };

function meta(info: ImageInfo, key: string): string {
  const value = info.extmetadata?.[key]?.value;
  return typeof value === "string" ? value : "";
}

function isUploadUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === COMMONS_UPLOAD_HOST;
  } catch {
    return false;
  }
}

/** Una página de la respuesta, o null si no es una foto que se pueda usar. */
export function photoFromPage(page: Page): CommonsPhoto | null {
  const info = page.imageinfo?.[0];
  if (!page.title || !info?.thumburl || !info.descriptionurl) return null;
  if (!info.mime || !MIME_OK.has(info.mime)) return null;
  if (!isUploadUrl(info.thumburl)) return null;
  const license = plainText(meta(info, "LicenseShortName"));
  if (!license || !isAllowedLicense(license)) return null;
  const author = plainText(meta(info, "Artist")) || plainText(meta(info, "Credit"));
  return {
    title: page.title,
    pageUrl: info.descriptionurl,
    imageUrl: info.thumburl,
    width: info.thumbwidth ?? 0,
    height: info.thumbheight ?? 0,
    license,
    licenseUrl: meta(info, "LicenseUrl") || null,
    author,
    description: plainText(meta(info, "ImageDescription")).slice(0, 300),
    credit: buildCredit(author, license),
  };
}

/** Fotos utilizables de una respuesta de `action=query&prop=imageinfo`, en el orden de la búsqueda. */
export function parseCommonsResponse(json: unknown): CommonsPhoto[] {
  const pages = (json as { query?: { pages?: Page[] } } | null)?.query?.pages;
  if (!Array.isArray(pages)) return [];
  return [...pages]
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map(photoFromPage)
    .filter((photo): photo is CommonsPhoto => photo !== null);
}

/** Parámetros comunes de la consulta: imageinfo con la copia reducida y los metadatos de licencia. */
export function imageInfoParams(): Record<string, string> {
  return {
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: String(COMMONS_WIDTH),
    iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription",
  };
}
