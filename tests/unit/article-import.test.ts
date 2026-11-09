import { describe, expect, it } from "vitest";
import { creditParagraph, importedDoc, metaContent, parseArticlePage } from "@/lib/article-import";

const URL_NOTA = new URL("https://www.ejemplo.com.ar/politica/una-nota");

const PAGE = `<!doctype html><html><head>
<title>Título de la pestaña | Ejemplo</title>
<meta content="El título de la nota" property="og:title">
<meta property="og:description" content="La bajada de la nota, con &quot;comillas&quot;.">
<meta property="og:image" content="/fotos/principal.jpg">
<meta property="og:site_name" content="Diario Ejemplo">
<script>var x = "<p>esto no es texto de la nota, es un script que no se tiene que leer</p>";</script>
</head><body>
<nav><p>Menú con un párrafo largo que no es parte de la nota y no se tiene que traer.</p></nav>
<article>
<h1>El título de la nota</h1>
<p>La bajada de la nota, con "comillas".</p>
<p>Primer párrafo de la nota, con suficiente texto para que cuente como párrafo real &amp; válido.</p>
<h2>Un subtítulo</h2>
<p>Segundo párrafo de la nota, también con texto suficiente para pasar el filtro de largo.</p>
<p>Corto.</p>
<p>Seguí leyendo: otra nota que no tiene nada que ver con esta y no se tiene que traer.</p>
<aside><p>Párrafo de una columna lateral que tampoco es parte de la nota que se importa.</p></aside>
${"<p>Relleno para que el artículo sea el contenedor principal de la página y se elija.</p>".repeat(20)}
<h3>Más leídas</h3>
</article>
</body></html>`;

describe("metaContent", () => {
  it("lee el atributo content sin importar el orden de los atributos", () => {
    expect(metaContent(PAGE, ["og:title"])).toBe("El título de la nota");
    expect(metaContent(PAGE, ["og:nada", "og:site_name"])).toBe("Diario Ejemplo");
    expect(metaContent(PAGE, ["og:nada"])).toBe("");
  });
});

describe("parseArticlePage", () => {
  const page = parseArticlePage(PAGE, URL_NOTA);

  it("toma título, bajada, sitio e imagen absoluta de los metadatos", () => {
    expect(page.title).toBe("El título de la nota");
    expect(page.excerpt).toBe('La bajada de la nota, con "comillas".');
    expect(page.siteName).toBe("Diario Ejemplo");
    expect(page.imageUrl).toBe("https://www.ejemplo.com.ar/fotos/principal.jpg");
  });

  it("trae los párrafos y subtítulos de la nota, sin menú, scripts, invitaciones ni repetidos", () => {
    expect(page.blocks.slice(0, 3)).toEqual([
      {
        type: "paragraph",
        text: "Primer párrafo de la nota, con suficiente texto para que cuente como párrafo real & válido.",
      },
      { type: "heading", text: "Un subtítulo" },
      {
        type: "paragraph",
        text: "Segundo párrafo de la nota, también con texto suficiente para pasar el filtro de largo.",
      },
    ]);
    const texts = page.blocks.map((block) => block.text).join("\n");
    expect(texts).not.toMatch(/Menú|script|Seguí leyendo|columna lateral|Corto|Más leídas/);
    expect(page.blocks.filter((block) => block.text.startsWith("Relleno"))).toHaveLength(1);
  });

  it("sin og:site_name usa el dominio", () => {
    const bare = parseArticlePage("<title>Algo</title><p>" + "texto ".repeat(20) + "</p>", URL_NOTA);
    expect(bare.siteName).toBe("ejemplo.com.ar");
    expect(bare.title).toBe("Algo");
    expect(bare.imageUrl).toBeNull();
  });

  it("si los párrafos son pocos, usa el articleBody de los datos estructurados", () => {
    const body =
      "Primera oración larga del cuerpo. Segunda oración. Tercera oración. Cuarta oración. ".repeat(5);
    const html = `<title>T</title><script type="application/ld+json">${JSON.stringify({
      "@type": "NewsArticle",
      articleBody: body,
    })}</script><p>Un párrafo suelto que tiene más de cuarenta caracteres de largo.</p>`;
    const parsed = parseArticlePage(html, URL_NOTA);
    expect(parsed.blocks.length).toBeGreaterThan(1);
    expect(parsed.blocks[0].text).toBe("Primera oración larga del cuerpo. Segunda oración. Tercera oración.");
  });
});

describe("importedDoc", () => {
  it("termina con «Gracias al aporte de» y el enlace a la nota original", () => {
    const doc = importedDoc(parseArticlePage(PAGE, URL_NOTA), URL_NOTA.toString());
    expect(doc.type).toBe("doc");
    expect(doc.content?.at(-1)).toEqual(creditParagraph("Diario Ejemplo", URL_NOTA.toString()));
    const credit = doc.content?.at(-1)?.content ?? [];
    expect(credit.map((node) => node.text).join("")).toBe("Gracias al aporte de Diario Ejemplo.");
    expect(credit[1].marks).toContainEqual({ type: "link", attrs: { href: URL_NOTA.toString() } });
    expect(doc.content?.[1]).toEqual({
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Un subtítulo" }],
    });
  });
});
