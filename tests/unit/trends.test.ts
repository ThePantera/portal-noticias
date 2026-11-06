import { describe, expect, it } from "vitest";
import { cleanText, clusterTopics, extractArticleText, keywordsOf, parseFeed } from "@/lib/trends";

function rss(titles: string[]) {
  return `<rss><channel>${titles
    .map(
      (title, i) =>
        `<item><title><![CDATA[${title}]]></title><link>https://medio.example/${i}</link><pubDate>Fri, 06 Nov 2026 18:00:00 GMT</pubDate><description>&lt;p&gt;Resumen &amp;amp; más&lt;/p&gt;</description></item>`,
    )
    .join("")}</channel></rss>`;
}

describe("feeds", () => {
  it("lee RSS con CDATA, fecha y entidades escapadas dos veces", () => {
    const [item] = parseFeed(rss(["Título de prueba"]), "infobae");
    expect(item).toMatchObject({
      source: "infobae",
      title: "Título de prueba",
      link: "https://medio.example/0",
      summary: "Resumen & más",
    });
    expect(item.publishedAt?.toISOString()).toBe("2026-11-06T18:00:00.000Z");
  });

  it("lee Atom y el tráfico de Google Trends", () => {
    const atom = parseFeed(
      '<feed><entry><title>Nota</title><link href="https://a.example/n"/><updated>2026-11-06T10:00:00Z</updated></entry></feed>',
      "atom",
    );
    expect(atom[0]).toMatchObject({ title: "Nota", link: "https://a.example/n" });
    const trend = parseFeed(
      "<rss><item><title>dólar</title><ht:approx_traffic>5000+</ht:approx_traffic></item></rss>",
      "google-trends-ar",
    );
    expect(trend[0].traffic).toBe("5000+");
  });

  it("limpia HTML", () => {
    expect(cleanText("<b>Hola</b> &quot;mundo&quot; &#233;")).toBe('Hola "mundo" é');
  });
});

describe("temas en tendencia", () => {
  const items = [
    ...parseFeed(
      rss(["Milei anunció un paquete de reformas laborales en el Congreso", "River venció a Boca"]),
      "infobae",
    ),
    ...parseFeed(rss(["Reformas laborales: Milei envía el paquete al Congreso"]), "clarin"),
    ...parseFeed(
      rss(["El Congreso recibe las reformas laborales de Milei", "Alerta por tormentas"]),
      "lanacion",
    ),
    ...parseFeed("<rss><item><title>reformas laborales</title></item></rss>", "google-trends-ar"),
  ];

  it("saca palabras de relleno y tildes", () => {
    expect(keywordsOf("Milei anunció un nuevo paquete")).toEqual(["milei", "anuncio", "paquete"]);
  });

  it("agrupa lo que cubren tres fuentes y lo marca si está en Google Trends", () => {
    const topics = clusterTopics(items, new Date("2026-11-06T19:00:00Z"));
    expect(topics).toHaveLength(1);
    expect(topics[0]).toMatchObject({ sourceCount: 3, googleTrend: "reformas laborales" });
    expect(topics[0].keywords).toEqual(
      expect.arrayContaining(["milei", "reformas", "laborales", "congreso"]),
    );
    expect(topics[0].items).toHaveLength(3);
  });

  it("con dos fuentes no alcanza, salvo que se pida", () => {
    const two = items.filter((item) => item.source !== "lanacion");
    expect(clusterTopics(two, new Date())).toHaveLength(0);
    expect(clusterTopics(two, new Date(), 2)).toHaveLength(1);
  });
});

describe("texto de una nota", () => {
  it("prefiere el articleBody de los datos estructurados", () => {
    const body = "Texto de la nota. ".repeat(20);
    const html = `<meta property="og:title" content="Título &amp; más"><script type="application/ld+json">{"@type":"NewsArticle","articleBody":"${body}"}</script><p>corto</p>`;
    expect(extractArticleText(html)).toEqual({ title: "Título & más", text: body.trim() });
  });

  it("si no hay datos estructurados, junta los párrafos largos", () => {
    const paragraph = "Un párrafo bastante largo para que cuente como parte del texto de la nota.";
    expect(extractArticleText(`<title>T</title><p>${paragraph}</p><p>corto</p>`)).toEqual({
      title: "T",
      text: paragraph,
    });
  });
});

describe("entidades con nombre", () => {
  it("decodifica tildes, eñes y comillas", () => {
    expect(
      cleanText("Le&oacute;n XIV lleg&oacute; a &ldquo;Montevideo&rdquo; &mdash; Espa&ntilde;a &Aacute;"),
    ).toBe("León XIV llegó a “Montevideo” — España Á");
  });
});
