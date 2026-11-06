/**
 * Detección de tendencias a partir de feeds RSS/Atom de medios y de Google (ADR 0011).
 * Funciones puras: leer un feed, normalizar titulares y agrupar en temas los que se repiten
 * en varias fuentes. La descarga vive en src/server/services/trends.ts.
 */

export type FeedItem = {
  source: string;
  title: string;
  link: string;
  summary: string;
  publishedAt: Date | null;
  /** Sólo Google Trends: tráfico aproximado ("2000+"). */
  traffic?: string;
};

export type TrendTopic = {
  /** Palabras que comparten los titulares del tema, de la más a la menos repetida. */
  keywords: string[];
  /** Cantidad de fuentes distintas que lo cubren. */
  sourceCount: number;
  /** Puntaje para ordenar: fuentes, Google Trends y qué tan reciente es. */
  score: number;
  /** Coincide con una búsqueda en alza de Google Trends. */
  googleTrend: string | null;
  latestAt: Date | null;
  items: FeedItem[];
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

/**
 * Saca CDATA, etiquetas HTML y entidades. Muchos feeds escapan dos veces ("&amp;amp;"), así
 * que las entidades se decodifican dos veces.
 */
export function cleanText(value: string): string {
  const once = decodeEntities(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]*>/g, " "));
  return decodeEntities(once.replace(/<[^>]*>/g, " "))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return match ? match[1] : "";
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(cleanText(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Lee los ítems de un feed RSS 2.0 o Atom. Ignora lo que no tenga título. */
export function parseFeed(xml: string, source: string): FeedItem[] {
  const blocks =
    xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  const items: FeedItem[] = [];
  for (const block of blocks) {
    const title = cleanText(tag(block, "title"));
    if (!title) continue;
    const atomLink = block.match(/<link[^>]*href="([^"]+)"/i)?.[1];
    const link = cleanText(tag(block, "link")) || atomLink || "";
    const summary = cleanText(tag(block, "description") || tag(block, "summary")).slice(0, 400);
    const publishedAt = parseDate(tag(block, "pubDate") || tag(block, "published") || tag(block, "updated"));
    const traffic = cleanText(tag(block, "ht:approx_traffic")) || undefined;
    items.push({ source, title, link, summary, publishedAt, ...(traffic ? { traffic } : {}) });
  }
  return items;
}

/** Palabras que no dicen de qué trata una nota. */
const STOPWORDS = new Set(
  "a al ante antes aun ano anos asi bajo bien cada como con contra cual cuales cuando de del desde despues donde dos el ella ellos en entre era es esa ese eso esta este esto estos fue fueron gran ha hace hacia han hasta hay la las le les lo los mas me mientras muy ni no nos nueva nuevo nuevos nuevas o otra otro para pero poco por porque que quien se sea segun ser si sin sobre su sus tambien tan tras tres un una uno unos uso ya hoy ayer manana dia dias tiene tienen puede pueden fue sera seran estan esta dijo dice afirmo asegura aseguro cuanto cuantos todo todos toda todas mismo misma vez veces quien quienes video fotos foto ultimo ultima minuto vivo cual como cuanto horas hora semana mes despues mejor peor primer primera segundo segunda argentina argentino argentinos".split(
    " ",
  ),
);

/** Minúsculas, sin tildes ni signos. */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Palabras significativas de un titular (4 letras o más, sin las de relleno). */
export function keywordsOf(title: string): string[] {
  const words = normalize(title)
    .split(" ")
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word) && !/^\d+$/.test(word));
  return [...new Set(words)];
}

/** Puntos que suma un tema por fuente distinta, por coincidir con Google Trends y por ser reciente. */
const SOURCE_POINTS = 10;
const TREND_POINTS = 15;
const FRESH_HOURS = 6;

/**
 * Agrupa en temas los titulares que comparten al menos dos palabras significativas.
 * Un tema sólo cuenta si lo cubren `minSources` fuentes distintas. Los feeds de Google Trends
 * (source que empieza con "google-trends") no forman temas: marcan los que coinciden.
 */
export function clusterTopics(items: FeedItem[], now: Date, minSources = 3): TrendTopic[] {
  const trends = items.filter((item) => item.source.startsWith("google-trends"));
  const news = items.filter((item) => !item.source.startsWith("google-trends"));
  const keywords = news.map((item) => keywordsOf(item.title));

  const groups: number[][] = [];
  const groupOf = new Map<number, number>();
  for (let i = 0; i < news.length; i++) {
    for (let j = 0; j < i; j++) {
      const shared = keywords[i].filter((word) => keywords[j].includes(word)).length;
      if (shared < 2) continue;
      const target = groupOf.get(j)!;
      groups[target].push(i);
      groupOf.set(i, target);
      break;
    }
    if (groupOf.get(i) === undefined) {
      groupOf.set(i, groups.length);
      groups.push([i]);
    }
  }

  const topics: TrendTopic[] = [];
  for (const group of groups) {
    const groupItems = group.map((index) => news[index]);
    const sources = new Set(groupItems.map((item) => item.source));
    if (sources.size < minSources) continue;

    const counts = new Map<string, number>();
    for (const index of group)
      for (const word of keywords[index]) counts.set(word, (counts.get(word) ?? 0) + 1);
    const topicWords = [...counts.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([word]) => word);

    const trend = trends.find((item) => {
      const words = keywordsOf(item.title);
      return words.length > 0 && words.every((word) => topicWords.includes(word));
    });
    const dates = groupItems.map((item) => item.publishedAt?.getTime() ?? 0).filter((time) => time > 0);
    const latest = dates.length > 0 ? new Date(Math.max(...dates)) : null;
    const ageHours = latest ? (now.getTime() - latest.getTime()) / 3_600_000 : FRESH_HOURS * 4;
    const freshness = Math.max(0, FRESH_HOURS - ageHours);

    topics.push({
      keywords: topicWords.slice(0, 8),
      sourceCount: sources.size,
      score: Math.round(sources.size * SOURCE_POINTS + (trend ? TREND_POINTS : 0) + freshness),
      googleTrend: trend?.title ?? null,
      latestAt: latest,
      items: groupItems.sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)),
    });
  }
  return topics.sort((a, b) => b.score - a.score);
}

function findArticleBody(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findArticleBody(item);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.articleBody === "string" && record.articleBody.length > 200) return record.articleBody;
    if (record["@graph"]) return findArticleBody(record["@graph"]);
  }
  return null;
}

/**
 * Texto de una nota de otro medio, para que el asistente la lea y escriba la propia con sus
 * palabras. Usa el articleBody de los datos estructurados; si no hay, los párrafos.
 */
export function extractArticleText(html: string, maxLength = 12_000): { title: string; text: string } {
  const title = cleanText(
    html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]*)"/i)?.[1] ?? tag(html, "title"),
  );
  for (const script of html.match(/<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) ?? []) {
    try {
      const body = findArticleBody(JSON.parse(script.replace(/^<script[^>]*>|<\/script>$/gi, "")));
      if (body) return { title, text: cleanText(body).slice(0, maxLength) };
    } catch {
      // Datos estructurados rotos: se prueba con el siguiente o con los párrafos.
    }
  }
  const paragraphs = (html.match(/<p[\s>][\s\S]*?<\/p>/gi) ?? [])
    .map(cleanText)
    .filter((text) => text.length > 60);
  return { title, text: paragraphs.join("\n\n").slice(0, maxLength) };
}
