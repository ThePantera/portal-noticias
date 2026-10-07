import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { env } from "@/server/env";
import { getSitemapEntries } from "@/server/services/public-content";

/** sitemap.xml: portada, secciones, mercados, notas publicadas y etiquetas con notas. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { articles, categories, tags } = await getSitemapEntries();
  const url = (path: string) => absoluteUrl(env.SITE_URL, path);
  return [
    { url: url("/"), lastModified: articles[0]?.updatedAt, changeFrequency: "hourly", priority: 1 },
    ...categories.map((c) => ({
      url: url(`/categoria/${c.slug}`),
      lastModified: c.updatedAt,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
    { url: url("/mercados"), changeFrequency: "hourly" as const, priority: 0.6 },
    ...articles.map((a) => ({ url: url(`/noticias/${a.slug}`), lastModified: a.updatedAt, priority: 0.7 })),
    ...tags.map((t) => ({ url: url(`/tag/${t.slug}`), changeFrequency: "daily" as const, priority: 0.4 })),
  ];
}
