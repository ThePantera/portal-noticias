import { absoluteUrl, escapeXml } from "@/lib/seo";
import { env } from "@/server/env";
import { getFeedArticles } from "@/server/services/public-content";

/** RSS 2.0 con las últimas notas publicadas. */
export async function GET() {
  const articles = await getFeedArticles();
  const home = absoluteUrl(env.SITE_URL, "/");
  const items = articles
    .map((a) => {
      const link = escapeXml(absoluteUrl(env.SITE_URL, `/noticias/${a.slug}`));
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(a.excerpt)}</description>
      <category>${escapeXml(a.category.name)}</category>
      <dc:creator>${escapeXml(a.authorName)}</dc:creator>
      <pubDate>${a.publishedAt.toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(env.SITE_NAME)}</title>
    <link>${escapeXml(home)}</link>
    <description>${escapeXml(`Últimas noticias de ${env.SITE_NAME}`)}</description>
    <language>es-AR</language>
    <atom:link href="${escapeXml(absoluteUrl(env.SITE_URL, "/feed.xml"))}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
