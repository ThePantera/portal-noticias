import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { env } from "@/server/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/buscar"] },
    sitemap: [absoluteUrl(env.SITE_URL, "/sitemap.xml"), absoluteUrl(env.SITE_URL, "/news-sitemap.xml")],
  };
}
