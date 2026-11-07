/**
 * Publicador automático de notas de tendencia (ADR 0012). Funciones puras: elegir el tema,
 * armar el pedido al modelo y convertir su respuesta en una nota. La parte que habla con
 * los medios, la API de Claude y la base vive en src/server/services/autopublish.ts.
 */
import { z } from "zod";
import type { EditorNode } from "./content";
import { keywordsOf, type FeedItem, type TrendTopic } from "./trends";

/** Mínimo de notas de medios distintos que hay que leer para escribir una nota. */
export const MIN_SOURCES = 2;
/** Máximo de fuentes que se mandan al modelo (cada una recortada a SOURCE_CHARS). */
export const MAX_SOURCES = 3;
export const SOURCE_CHARS = 6000;
/** Largo mínimo aceptable de la nota; al modelo se le piden entre 600 y 850 palabras. */
export const MIN_WORDS = 450;

/** Ediciones de otros países o secciones de agencias del exterior que no son noticia nacional. */
const FOREIGN_PATH =
  /infobae\.com\/(peru|mexico|colombia|espana|venezuela|chile|uruguay|paraguay|ecuador|centroamerica)\//i;
/** Coberturas minuto a minuto, agendas de TV y otros resúmenes que no son un hecho. */
const ROUNDUP_TITLE = /\b(en vivo|minuto a minuto|en directo|agenda de la tv|hor[oó]scopo|quiniela)\b/i;

/** ¿El tema ya está cubierto por una nota reciente del portal? Comparten 3 palabras o la mitad. */
export function isCovered(topicKeywords: string[], recentTitles: string[]): boolean {
  const topic = topicKeywords.slice(0, 6);
  if (topic.length === 0) return false;
  return recentTitles.some((title) => {
    const words = keywordsOf(title);
    const shared = topic.filter((word) => words.includes(word)).length;
    return shared >= 3 || shared / topic.length >= 0.5;
  });
}

/** Notas del tema que se pueden leer: de medios (no de Google), nacionales y que no sean resúmenes. */
export function readableItems(topic: TrendTopic): FeedItem[] {
  const seen = new Set<string>();
  const items: FeedItem[] = [];
  for (const item of topic.items) {
    if (item.source.startsWith("google")) continue;
    if (FOREIGN_PATH.test(item.link) || ROUNDUP_TITLE.test(item.title)) continue;
    if (!item.link.startsWith("https://") || seen.has(item.source)) continue;
    seen.add(item.source);
    items.push(item);
  }
  return items;
}

/** Temas que valen una nota, del mejor al peor: no cubiertos y con al menos dos medios para leer. */
export function pickTopics(topics: TrendTopic[], recentTitles: string[]): TrendTopic[] {
  return topics.filter(
    (topic) => !isCovered(topic.keywords, recentTitles) && readableItems(topic).length >= MIN_SOURCES,
  );
}

export type SourceText = { name: string; url: string; title: string; text: string };

/** Respuesta del modelo. `skip` cuando las fuentes no alcanzan o no hablan del mismo hecho. */
export const draftSchema = z.object({
  skip: z.boolean(),
  skipReason: z.string(),
  title: z.string(),
  excerpt: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  seoDescription: z.string(),
  blocks: z.array(z.object({ heading: z.string(), text: z.string() })),
  photoQueries: z.array(z.string()),
  photoAlt: z.string(),
  usedSources: z.array(z.number().int()),
});
export type Draft = z.infer<typeof draftSchema>;

/** Esquema JSON que se le pasa a la API para que responda siempre con esta forma. */
export function draftJsonSchema(categories: string[]) {
  const text = { type: "string" };
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "skip",
      "skipReason",
      "title",
      "excerpt",
      "category",
      "tags",
      "seoDescription",
      "blocks",
      "photoQueries",
      "photoAlt",
      "usedSources",
    ],
    properties: {
      skip: { type: "boolean" },
      skipReason: text,
      title: text,
      excerpt: text,
      category: { type: "string", enum: categories },
      tags: { type: "array", items: text },
      seoDescription: text,
      blocks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["heading", "text"],
          properties: { heading: text, text },
        },
      },
      photoQueries: { type: "array", items: text },
      photoAlt: text,
      usedSources: { type: "array", items: { type: "integer" } },
    },
  };
}

export const SYSTEM_PROMPT = `Sos redactor de MeContaron, un diario digital nacional argentino. Escribís notas propias a partir de notas de otros medios que te pasan como fuentes.

Reglas:
- Escribí con tus palabras. Nunca copies frases ni párrafos de las fuentes.
- Usá sólo datos que aparezcan en al menos dos fuentes. Si un dato está en una sola, dejalo afuera. La única excepción son las citas textuales: pueden venir de una sola fuente si las copiás tal cual y las atribuís a quien las dijo.
- Nunca inventes datos, cifras, fechas, nombres ni citas que no estén en las fuentes. Si las fuentes dan poco, escribí una nota más corta antes que rellenar o suponer.
- Hechos policiales o judiciales: atribuí ("según la fiscalía", "de acuerdo con la denuncia"), no des por probado lo que no está probado y no nombres a menores ni a víctimas de delitos sexuales.
- Tono informativo y neutral, español rioplatense, contexto para el lector argentino. Sin opiniones, sin clickbait, sin signos de exclamación.
- Si las fuentes no hablan del mismo hecho, o no alcanzan para una nota seria, respondé con skip en true y explicá por qué en skipReason (los demás campos pueden ir vacíos).

Formato:
- title: hasta 110 caracteres, claro, con el hecho principal.
- excerpt: una o dos oraciones, hasta 220 caracteres.
- blocks: cada bloque es un párrafo (text) y puede llevar un subtítulo corto (heading, vacío si no lleva). Una sección con varios párrafos es un bloque con subtítulo seguido de bloques sin subtítulo. En total, entre 600 y 850 palabras; si las fuentes no dan para tanto, no menos de 450. No agregues un párrafo de fuentes: se agrega solo.
- Estructura de la nota:
  1. Primer bloque sin subtítulo: el hecho principal, respondiendo qué pasó, quién, cuándo y dónde.
  2. Después, secciones con subtítulo, en este orden: "Qué se sabe" (los detalles del hecho), "El contexto" (antecedentes y por qué importa), "Qué dijeron" (sólo si las fuentes traen citas textuales: copialas tal cual, entre comillas y atribuidas a quien las dijo) y "Qué sigue" (próximos pasos, plazos o decisiones pendientes).
  3. Si el tema es un hecho en desarrollo (una investigación, un accidente, una crisis, una medida que todavía no se aplica), podés sumar "Qué falta saber" antes de "Qué sigue", sólo con lo que las fuentes dicen que todavía no se sabe.
  Omití cualquier sección para la que las fuentes no tengan datos. Cada párrafo aporta información nueva: sin relleno, sin repetir datos ya dichos y sin párrafos de cierre que resuman la nota.
- category: la sección que corresponde.
- tags: de 2 a 5 etiquetas cortas.
- seoDescription: hasta 155 caracteres.
- photoQueries: 2 o 3 búsquedas para Wikimedia Commons (en inglés y en español) de una foto que muestre algo real del tema: la persona principal, el lugar o el edificio. Nunca logos.
- photoAlt: qué se vería en esa foto, en una oración.
- usedSources: los números de las fuentes que usaste.`;

/** Mensaje del usuario: las fuentes numeradas, recortadas. */
export function sourcesMessage(sources: SourceText[], today: string): string {
  const blocks = sources.map(
    (source, index) =>
      `<fuente numero="${index}" medio="${source.name}">\nTítulo: ${source.title}\n\n${source.text.slice(0, SOURCE_CHARS)}\n</fuente>`,
  );
  return `Hoy es ${today}. Escribí la nota a partir de estas fuentes:\n\n${blocks.join("\n\n")}`;
}

const MAX = { title: 120, excerpt: 300, seo: 160, tag: 40 };

function cut(value: string, max: number): string {
  const text = value.trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Documento del editor (Tiptap) a partir de los bloques del modelo. */
export function draftToContent(draft: Draft): EditorNode {
  const content: EditorNode[] = [];
  for (const block of draft.blocks) {
    const heading = block.heading.trim();
    const text = block.text.trim();
    if (heading) {
      content.push({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: heading }] });
    }
    if (text) content.push({ type: "paragraph", content: [{ type: "text", text }] });
  }
  return { type: "doc", content };
}

export function wordCount(draft: Draft): number {
  return draft.blocks.reduce((total, block) => total + block.text.split(/\s+/).filter(Boolean).length, 0);
}

/**
 * Valida la respuesta del modelo y la deja lista para crear la nota. Devuelve un motivo en
 * vez de la nota si no sirve (pidió saltear, quedó muy corta o eligió una sección que no existe).
 */
export function checkDraft(
  draft: Draft,
  categories: string[],
  sources: SourceText[],
): { ok: true; article: ReadyArticle } | { ok: false; reason: string } {
  if (draft.skip) return { ok: false, reason: draft.skipReason || "el modelo pidió saltear el tema" };
  if (!draft.title.trim()) return { ok: false, reason: "sin título" };
  if (!categories.includes(draft.category))
    return { ok: false, reason: `sección inválida: ${draft.category}` };
  const words = wordCount(draft);
  if (words < MIN_WORDS) return { ok: false, reason: `nota muy corta (${words} palabras)` };
  const used = [...new Set(draft.usedSources)].filter((index) => sources[index]);
  const cited = (used.length >= MIN_SOURCES ? used : sources.map((_, index) => index)).map((index) => ({
    name: sources[index].name,
    url: sources[index].url,
  }));
  return {
    ok: true,
    article: {
      title: cut(draft.title, MAX.title),
      excerpt: cut(draft.excerpt, MAX.excerpt),
      content: draftToContent(draft),
      category: draft.category,
      tags: [...new Set(draft.tags.map((tag) => cut(tag, MAX.tag)).filter(Boolean))].slice(0, 5),
      seoDescription: cut(draft.seoDescription || draft.excerpt, MAX.seo),
      sources: cited,
      photoQueries: draft.photoQueries.map((query) => query.trim()).filter((query) => query.length >= 2),
      photoAlt: cut(draft.photoAlt || draft.title, 200),
    },
  };
}

export type ReadyArticle = {
  title: string;
  excerpt: string;
  content: EditorNode;
  category: string;
  tags: string[];
  seoDescription: string;
  sources: { name: string; url: string }[];
  photoQueries: string[];
  photoAlt: string;
};

/** Prefiere fotos horizontales y no muy chicas; descarta logos y escudos por el nombre. */
export function pickPhoto<T extends { title: string; width: number; height: number }>(photos: T[]): T | null {
  const usable = photos.filter(
    (photo) =>
      photo.width >= 800 && !/logo|escudo|coat of arms|flag of|bandera|icon|map\b|mapa/i.test(photo.title),
  );
  return usable.find((photo) => photo.width >= photo.height * 1.2) ?? usable[0] ?? null;
}
