import { describe, expect, it } from "vitest";
import {
  checkDraft,
  draftJsonSchema,
  draftSchema,
  draftToContent,
  isCovered,
  pickPhoto,
  pickTopics,
  readableItems,
  sourcesMessage,
  type Draft,
  type SourceText,
} from "@/lib/autopublish";
import type { FeedItem, TrendTopic } from "@/lib/trends";

function item(source: string, title: string, link = `https://${source}.example/nota`): FeedItem {
  return { source, title, link, summary: "", publishedAt: new Date("2026-11-06T18:00:00Z") };
}

function topic(keywords: string[], items: FeedItem[]): TrendTopic {
  return { keywords, sourceCount: items.length, score: 30, googleTrend: null, latestAt: null, items };
}

const sources: SourceText[] = [
  { name: "TN", url: "https://tn.com.ar/a", title: "A", text: "texto a" },
  { name: "Clarín", url: "https://www.clarin.com/b", title: "B", text: "texto b" },
  { name: "La Nación", url: "https://www.lanacion.com.ar/c", title: "C", text: "texto c" },
];

const words = (count: number) => Array.from({ length: count }, (_, i) => `palabra${i}`).join(" ");

const draft: Draft = {
  skip: false,
  skipReason: "",
  title: "El papa León XIV llegó a Uruguay",
  excerpt: "Empieza su gira por Sudamérica.",
  category: "sociedad",
  tags: ["Papa", "Uruguay", "Papa"],
  seoDescription: "",
  blocks: [
    { heading: "", text: words(150) },
    { heading: "Cuándo llega", text: words(120) },
  ],
  photoQueries: ["Pope Leo XIV", " "],
  photoAlt: "El Papa saluda",
  usedSources: [0, 2, 2, 9],
};

describe("elección del tema", () => {
  it("detecta un tema ya cubierto por una nota reciente", () => {
    const recent = ["El papa León XIV llegó a Uruguay y empieza su gira"];
    expect(isCovered(["leon", "papa", "uruguay", "gira"], recent)).toBe(true);
    expect(isCovered(["trump", "gabinete", "miller"], recent)).toBe(false);
  });

  it("descarta Google, ediciones extranjeras, coberturas en vivo y medios repetidos", () => {
    const items = readableItems(
      topic(
        ["papa"],
        [
          item("google-news-ar", "Papa en Uruguay"),
          item("infobae", "Papa en Perú", "https://www.infobae.com/peru/2026/11/06/papa/"),
          item("lanacion", "Visita del Papa, EN VIVO: la agenda"),
          item("tn", "El Papa llegó a Uruguay"),
          item("tn", "Otra de TN"),
          item("clarin", "León XIV ya está en Montevideo"),
        ],
      ),
    );
    expect(items.map((i) => i.source)).toEqual(["tn", "clarin"]);
  });

  it("sólo propone temas nuevos con al menos dos medios para leer", () => {
    const papa = topic(["papa", "leon", "uruguay"], [item("tn", "a"), item("clarin", "b")]);
    const solo = topic(["riesgo", "pais"], [item("tn", "c"), item("google-news-ar", "d")]);
    const trump = topic(["trump", "miller", "gabinete"], [item("tn", "e"), item("lanacion", "f")]);
    expect(pickTopics([papa, solo, trump], ["El papa León XIV llegó a Uruguay"])).toEqual([trump]);
  });
});

describe("respuesta del modelo", () => {
  it("el esquema JSON pide todos los campos y limita la sección", () => {
    const schema = draftJsonSchema(["sociedad", "politica"]);
    expect(schema.required).toEqual(Object.keys(draftSchema.shape));
    expect(schema.properties.category).toEqual({ type: "string", enum: ["sociedad", "politica"] });
  });

  it("numera las fuentes y las recorta", () => {
    const message = sourcesMessage([{ ...sources[0], text: "x".repeat(10_000) }], "viernes 6 de noviembre");
    expect(message).toContain('<fuente numero="0" medio="TN">');
    expect(message).toContain("Hoy es viernes 6 de noviembre");
    expect(message.length).toBeLessThan(6200);
  });

  it("arma la nota con subtítulos, fuentes usadas y etiquetas sin repetir", () => {
    const result = checkDraft(draft, ["sociedad"], sources);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.article.sources.map((s) => s.name)).toEqual(["TN", "La Nación"]);
    expect(result.article.tags).toEqual(["Papa", "Uruguay"]);
    expect(result.article.seoDescription).toBe("Empieza su gira por Sudamérica.");
    expect(result.article.photoQueries).toEqual(["Pope Leo XIV"]);
    expect(result.article.content.content?.map((node) => node.type)).toEqual([
      "paragraph",
      "heading",
      "paragraph",
    ]);
  });

  it("cita todas las fuentes si el modelo marca menos de dos", () => {
    const result = checkDraft({ ...draft, usedSources: [1] }, ["sociedad"], sources);
    expect(result.ok && result.article.sources).toHaveLength(3);
  });

  it("rechaza saltos, secciones inexistentes y notas cortas", () => {
    expect(checkDraft({ ...draft, skip: true, skipReason: "no coinciden" }, ["sociedad"], sources)).toEqual({
      ok: false,
      reason: "no coinciden",
    });
    expect(checkDraft(draft, ["politica"], sources).ok).toBe(false);
    expect(
      checkDraft({ ...draft, blocks: [{ heading: "", text: words(50) }] }, ["sociedad"], sources).ok,
    ).toBe(false);
  });

  it("no deja párrafos vacíos", () => {
    const doc = draftToContent({ ...draft, blocks: [{ heading: " ", text: " " }] });
    expect(doc.content).toEqual([]);
  });
});

describe("foto", () => {
  it("prefiere horizontales y descarta logos y fotos chicas", () => {
    const photos = [
      { title: "File:Logo del club.png", width: 2000, height: 800 },
      { title: "File:Chica.jpg", width: 400, height: 300 },
      { title: "File:Retrato.jpg", width: 1200, height: 1600 },
      { title: "File:Plaza.jpg", width: 1600, height: 1000 },
    ];
    expect(pickPhoto(photos)?.title).toBe("File:Plaza.jpg");
    expect(pickPhoto(photos.slice(0, 3))?.title).toBe("File:Retrato.jpg");
    expect(pickPhoto([])).toBeNull();
  });
});
