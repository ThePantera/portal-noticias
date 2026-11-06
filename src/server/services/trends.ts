import "server-only";
import { clusterTopics, extractArticleText, parseFeed, type FeedItem, type TrendTopic } from "@/lib/trends";
import { db } from "@/server/db";

/**
 * Tendencias para el asistente de redacción (ADR 0011). El asistente corre en un entorno sin
 * salida a los medios; el sitio sí la tiene, así que lee los feeds y las notas por él. Sólo
 * habla con las direcciones de esta lista.
 */

type Source = { id: string; name: string; url: string };

export const TREND_SOURCES: Source[] = [
  {
    id: "google-trends-ar",
    name: "Google Trends Argentina",
    url: "https://trends.google.com/trending/rss?geo=AR",
  },
  {
    id: "google-news-ar",
    name: "Google Noticias Argentina",
    url: "https://news.google.com/rss?hl=es-419&gl=AR&ceid=AR:es-419",
  },
  { id: "infobae", name: "Infobae", url: "https://www.infobae.com/arc/outboundfeeds/rss/" },
  { id: "clarin", name: "Clarín", url: "https://www.clarin.com/rss/lo-ultimo/" },
  {
    id: "lanacion",
    name: "La Nación",
    url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml",
  },
  { id: "pagina12", name: "Página/12", url: "https://www.pagina12.com.ar/rss/portada" },
  { id: "ambito", name: "Ámbito", url: "https://www.ambito.com/rss/pages/home.xml" },
  { id: "perfil", name: "Perfil", url: "https://www.perfil.com/feed" },
  { id: "tn", name: "TN", url: "https://tn.com.ar/arc/outboundfeeds/rss/?outputType=xml" },
  { id: "ole", name: "Olé", url: "https://www.ole.com.ar/rss/ultimas-noticias/" },
  { id: "cronista", name: "El Cronista", url: "https://www.cronista.com/files/rss/news.xml" },
  { id: "bbc-mundo", name: "BBC Mundo", url: "https://feeds.bbci.co.uk/mundo/rss.xml" },
];

/** Medios cuyas notas se pueden leer con readSourceArticle. */
const READABLE_HOSTS = new Set([
  "www.infobae.com",
  "www.clarin.com",
  "www.lanacion.com.ar",
  "www.pagina12.com.ar",
  "www.ambito.com",
  "www.perfil.com",
  "tn.com.ar",
  "www.ole.com.ar",
  "www.cronista.com",
  "www.bbc.com",
]);

const USER_AGENT = "MeContaron/1.0 (+https://portal-noticias-zeta.vercel.app)";
const MAX_FEED_BYTES = 3_000_000;

export class TrendsError extends Error {
  constructor(
    readonly code: "invalid" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/rss+xml, application/xml, text/xml, text/html",
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`respondió ${response.status}`);
  const text = await response.text();
  if (text.length > MAX_FEED_BYTES) throw new Error("respuesta demasiado grande");
  return text;
}

export type SourceStatus = { id: string; name: string; ok: boolean; items: number; error?: string };

export type TrendsReport = {
  generatedAt: string;
  sources: SourceStatus[];
  topics: TrendTopic[];
  googleTrends: FeedItem[];
  /** Notas publicadas en el portal en las últimas 48 horas, para no repetir temas. */
  recentArticles: { title: string; slug: string; publishedAt: Date | null }[];
};

/** Lee todas las fuentes en paralelo y arma los temas en tendencia (3 fuentes o más). */
export async function getTrends(minSources = 3): Promise<TrendsReport> {
  const results = await Promise.all(
    TREND_SOURCES.map(async (source) => {
      try {
        const items = parseFeed(await fetchText(source.url, 7000), source.id);
        return { status: { id: source.id, name: source.name, ok: true, items: items.length }, items };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          status: { id: source.id, name: source.name, ok: false, items: 0, error: message },
          items: [] as FeedItem[],
        };
      }
    }),
  );
  const now = new Date();
  const items = results.flatMap((result) => result.items);
  const since = new Date(now.getTime() - 48 * 3_600_000);
  const recentArticles = await db.article.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: since } },
    orderBy: { publishedAt: "desc" },
    select: { title: true, slug: true, publishedAt: true },
    take: 100,
  });
  return {
    generatedAt: now.toISOString(),
    sources: results.map((result) => result.status),
    topics: clusterTopics(items, now, minSources).slice(0, 25),
    googleTrends: items.filter((item) => item.source === "google-trends-ar").slice(0, 25),
    recentArticles,
  };
}

/**
 * Lee una nota de uno de los medios de la lista, para que el asistente la use como fuente.
 * Sigue hasta tres redirecciones, todas dentro de la lista.
 */
export async function readSourceArticle(url: string): Promise<{ url: string; title: string; text: string }> {
  let current: URL;
  try {
    current = new URL(url);
  } catch {
    throw new TrendsError("invalid", "La dirección no es válida.");
  }
  for (let hop = 0; hop < 4; hop++) {
    if (current.protocol !== "https:" || !READABLE_HOSTS.has(current.hostname)) {
      throw new TrendsError("invalid", `Sólo se pueden leer notas de: ${[...READABLE_HOSTS].join(", ")}.`);
    }
    let response: Response;
    try {
      response = await fetch(current, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: AbortSignal.timeout(10_000),
        redirect: "manual",
        cache: "no-store",
      });
    } catch (error) {
      console.error("Tendencias: no se pudo leer la nota", error);
      throw new TrendsError("unavailable", "El medio no respondió.");
    }
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new TrendsError("unavailable", `El medio respondió ${response.status}.`);
    const html = await response.text();
    if (html.length > MAX_FEED_BYTES) throw new TrendsError("unavailable", "La página es demasiado grande.");
    const { title, text } = extractArticleText(html);
    if (!text) throw new TrendsError("unavailable", "No se encontró el texto de la nota.");
    return { url: current.toString(), title, text };
  }
  throw new TrendsError("unavailable", "Demasiadas redirecciones.");
}
