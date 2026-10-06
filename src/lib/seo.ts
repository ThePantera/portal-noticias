/**
 * Datos estructurados (JSON-LD) y utilidades de XML para buscadores y lectores de feeds.
 * Funciones puras: reciben la URL del sitio, no leen variables de entorno.
 */

type JsonLd = Record<string, unknown>;

/**
 * Serializa JSON-LD para un `<script>`. Escapa `<`, `>` y `&` (así un título con
 * "</script>" no corta el bloque ni inyecta HTML) y los separadores de línea U+2028/U+2029.
 */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function absoluteUrl(siteUrl: string, path: string): string {
  return new URL(path, siteUrl).toString();
}

type ArticleLdInput = {
  siteUrl: string;
  siteName: string;
  slug: string;
  title: string;
  description: string;
  publishedAt: Date;
  updatedAt: Date;
  authorName: string;
  section: string;
  keywords: string[];
  /** Direcciones de la imagen principal (absolutas o relativas al sitio). Google pide al menos una. */
  images?: string[];
};

export function newsArticleJsonLd(input: ArticleLdInput): JsonLd {
  const url = absoluteUrl(input.siteUrl, `/noticias/${input.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    headline: input.title.slice(0, 110),
    description: input.description,
    datePublished: input.publishedAt.toISOString(),
    dateModified: input.updatedAt.toISOString(),
    author: [{ "@type": "Person", name: input.authorName }],
    publisher: { "@type": "Organization", name: input.siteName, url: absoluteUrl(input.siteUrl, "/") },
    articleSection: input.section,
    ...(input.keywords.length ? { keywords: input.keywords.join(", ") } : {}),
    ...(input.images?.length ? { image: input.images.map((src) => absoluteUrl(input.siteUrl, src)) } : {}),
    inLanguage: "es-AR",
  };
}

export function breadcrumbJsonLd(siteUrl: string, items: { name: string; path: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(siteUrl, item.path),
    })),
  };
}

/** Portada: el sitio con su buscador y la organización que lo publica. */
export function websiteJsonLd(siteUrl: string, siteName: string): JsonLd[] {
  const home = absoluteUrl(siteUrl, "/");
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteName,
      url: home,
      inLanguage: "es-AR",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${absoluteUrl(siteUrl, "/buscar")}?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    { "@context": "https://schema.org", "@type": "NewsMediaOrganization", name: siteName, url: home },
  ];
}

/** Escapa texto para XML (sitemaps y RSS). Quita también los caracteres de control que XML no admite. */
export function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Enlace al RSS en `<head>`. Next combina `alternates` de forma superficial: cada página
 * que define su `canonical` tiene que repetir esto o el enlace desaparece.
 */
export const FEED_ALTERNATE_TYPES = { "application/rss+xml": "/feed.xml" };

/**
 * Código de verificación de Google Search Console. Acepta el código solo o la etiqueta
 * completa que copia Google (`<meta name="google-site-verification" content="…" />`).
 * Si no tiene la forma esperada devuelve undefined: un error al pegar no tumba el sitio.
 */
export function parseGoogleVerification(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  const code = /content\s*=\s*["']([^"']+)["']/i.exec(raw)?.[1] ?? raw;
  return /^[A-Za-z0-9_-]{10,100}$/.test(code) ? code : undefined;
}
