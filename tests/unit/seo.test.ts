import { describe, expect, it } from "vitest";
import {
  breadcrumbJsonLd,
  escapeXml,
  newsArticleJsonLd,
  parseGoogleVerification,
  serializeJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

describe("JSON-LD", () => {
  it("no deja cerrar el script ni inyectar HTML, y sigue siendo JSON válido", () => {
    const data = { headline: '</script><script>alert(1)</script> & "comillas"\u2028' };
    const out = serializeJsonLd(data);
    expect(out).not.toMatch(/[<>&\u2028]/);
    expect(JSON.parse(out)).toEqual(data);
  });

  it("describe una nota con fechas ISO, autor, sección y URL absoluta", () => {
    const ld = newsArticleJsonLd({
      siteUrl: "https://portal.test",
      siteName: "Portal",
      slug: "suben-las-tarifas",
      title: "Suben las tarifas",
      description: "Bajada",
      publishedAt: new Date("2026-10-06T12:00:00Z"),
      updatedAt: new Date("2026-10-06T13:00:00Z"),
      authorName: "Redacción",
      section: "Economía",
      keywords: ["Energía", "Tarifas"],
    });
    expect(ld).toMatchObject({
      "@type": "NewsArticle",
      url: "https://portal.test/noticias/suben-las-tarifas",
      datePublished: "2026-10-06T12:00:00.000Z",
      dateModified: "2026-10-06T13:00:00.000Z",
      author: [{ "@type": "Person", name: "Redacción" }],
      articleSection: "Economía",
      keywords: "Energía, Tarifas",
    });
  });

  it("arma migas de pan numeradas y el buscador del sitio", () => {
    const crumbs = breadcrumbJsonLd("https://portal.test", [
      { name: "Portada", path: "/" },
      { name: "Economía", path: "/categoria/economia" },
    ]);
    expect(crumbs.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Portada", item: "https://portal.test/" },
      { "@type": "ListItem", position: 2, name: "Economía", item: "https://portal.test/categoria/economia" },
    ]);
    const [site] = websiteJsonLd("https://portal.test", "Portal");
    expect(JSON.stringify(site)).toContain("https://portal.test/buscar?q={search_term_string}");
  });
});

describe("XML", () => {
  it("escapa los caracteres reservados y quita los de control", () => {
    expect(escapeXml(`Tom & "Jerry" <b>'s</b>\u0007`)).toBe(
      "Tom &amp; &quot;Jerry&quot; &lt;b&gt;&apos;s&lt;/b&gt;",
    );
  });
});

describe("verificación de Google", () => {
  it("acepta el código solo o la etiqueta completa, y descarta lo que no lo es", () => {
    const code = "AbC123_def-456ghiJKL";
    expect(parseGoogleVerification(code)).toBe(code);
    expect(parseGoogleVerification(`<meta name="google-site-verification" content="${code}" />`)).toBe(code);
    expect(parseGoogleVerification("")).toBeUndefined();
    expect(parseGoogleVerification(undefined)).toBeUndefined();
    expect(parseGoogleVerification('"><script>alert(1)</script>')).toBeUndefined();
  });
});
