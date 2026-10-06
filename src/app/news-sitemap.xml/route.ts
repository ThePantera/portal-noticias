import { absoluteUrl, escapeXml } from "@/lib/seo";
import { env } from "@/server/env";
import { getNewsSitemapArticles } from "@/server/services/public-content";

/** Sitemap de Google News: sólo las notas de las últimas 48 horas. */
export async function GET() {
  const articles = await getNewsSitemapArticles();
  const items = articles
    .map(
      (a) => `  <url>
    <loc>${escapeXml(absoluteUrl(env.SITE_URL, `/noticias/${a.slug}`))}</loc>
    <news:news>
      <news:publication><news:name>${escapeXml(env.SITE_NAME)}</news:name><news:language>es</news:language></news:publication>
      <news:publication_date>${(a.publishedAt ?? new Date(0)).toISOString()}</news:publication_date>
      <news:title>${escapeXml(a.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
