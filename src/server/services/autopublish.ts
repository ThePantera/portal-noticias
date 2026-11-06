import "server-only";
import {
  MAX_SOURCES,
  MIN_SOURCES,
  SYSTEM_PROMPT,
  checkDraft,
  draftJsonSchema,
  draftSchema,
  pickPhoto,
  pickTopics,
  readableItems,
  sourcesMessage,
  type SourceText,
} from "@/lib/autopublish";
import { env } from "@/server/env";
import {
  AssistantError,
  assistantArticlesLastDay,
  createAssistantArticle,
  listAssistantCategories,
  listLatestArticles,
} from "./assistant-articles";
import { ClaudeError, generateJson, type ClaudeUsage } from "./claude";
import { searchCommonsPhotos } from "./commons";
import { TREND_SOURCES, getTrends, readSourceArticle } from "./trends";

/**
 * Publicador automático (ADR 0012): toma el tema en tendencia mejor puntuado que el portal
 * todavía no cubrió, lee dos o tres notas de medios distintos, le pide la nota a Claude y la
 * publica con foto de Wikimedia Commons. Publica como mucho una nota por llamada.
 */

export type AutopublishResult =
  | { status: "published"; article: { id: string; slug: string; title: string }; usage: ClaudeUsage | null }
  | { status: "skipped"; reason: string; tried: string[] }
  | { status: "limit"; reason: string };

/** Temas que se prueban por llamada antes de rendirse (cada uno cuesta lecturas y quizás un pedido). */
const MAX_TOPICS_PER_RUN = 2;

const sourceName = new Map(TREND_SOURCES.map((source) => [source.id, source.name]));

/** Lee en paralelo las primeras notas del tema y se queda con hasta MAX_SOURCES con texto suficiente. */
async function readSources(items: { source: string; link: string }[]): Promise<SourceText[]> {
  const reads = await Promise.all(
    items.slice(0, MAX_SOURCES + 1).map(async (item) => {
      try {
        const read = await readSourceArticle(item.link);
        if (read.text.length < 600) return null;
        const name = sourceName.get(item.source) ?? item.source;
        return { name, url: read.url, title: read.title, text: read.text };
      } catch {
        // Medio caído o nota sin texto: queda afuera.
        return null;
      }
    }),
  );
  return reads.filter((read): read is SourceText => read !== null).slice(0, MAX_SOURCES);
}

async function findPhoto(queries: string[]) {
  for (const query of queries.slice(0, 3)) {
    try {
      const photo = pickPhoto(await searchCommonsPhotos(query.slice(0, 120)));
      if (photo) return photo;
    } catch {
      // Commons no respondió: se prueba la búsqueda siguiente y, si no, la nota sale sin foto.
    }
  }
  return null;
}

function today(): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

export async function runAutopublish(): Promise<AutopublishResult> {
  if (!env.ANTHROPIC_API_KEY) throw new ClaudeError("unconfigured", "Falta ANTHROPIC_API_KEY.");
  if ((await assistantArticlesLastDay()) >= env.AUTOPUBLISH_MAX_PER_DAY) {
    return { status: "limit", reason: `Ya se publicaron ${env.AUTOPUBLISH_MAX_PER_DAY} notas en 24 horas.` };
  }

  const [trends, latest, categoryRows] = await Promise.all([
    getTrends(),
    listLatestArticles(150),
    listAssistantCategories(),
  ]);
  const since = Date.now() - 48 * 3_600_000;
  const recentTitles = latest.filter((article) => article.createdAt.getTime() >= since).map((a) => a.title);
  const categories = categoryRows.map((category) => category.slug);

  const tried: string[] = [];
  for (const topic of pickTopics(trends.topics, recentTitles).slice(0, MAX_TOPICS_PER_RUN)) {
    const label = topic.keywords.slice(0, 4).join(" ");
    const sources = await readSources(readableItems(topic));
    if (sources.length < MIN_SOURCES) {
      tried.push(`${label}: no se pudieron leer dos fuentes`);
      continue;
    }

    const { data, usage } = await generateJson({
      system: SYSTEM_PROMPT,
      user: sourcesMessage(sources, today()),
      schema: draftJsonSchema(categories),
    });
    const parsed = draftSchema.safeParse(data);
    if (!parsed.success) {
      tried.push(`${label}: respuesta con otra forma`);
      continue;
    }
    const checked = checkDraft(parsed.data, categories, sources);
    if (!checked.ok) {
      tried.push(`${label}: ${checked.reason}`);
      continue;
    }

    const { photoQueries, photoAlt, ...article } = checked.article;
    const photo = await findPhoto(photoQueries);
    const create = (withPhoto: boolean) =>
      createAssistantArticle(
        {
          ...article,
          action: "publish",
          ...(withPhoto && photo ? { image: { commons: photo.title, alt: photoAlt } } : {}),
        },
        { maxPerDay: env.AUTOPUBLISH_MAX_PER_DAY },
      );
    try {
      // Si la foto no se pudo bajar o subir, la nota sale igual, sin foto.
      const created = await create(true).catch((error: unknown) => {
        if (photo && error instanceof AssistantError && error.code !== "rate-limited") return create(false);
        throw error;
      });
      return {
        status: "published",
        article: { id: created.id, slug: created.slug, title: created.title },
        usage,
      };
    } catch (error) {
      if (error instanceof AssistantError && error.code === "rate-limited") {
        return { status: "limit", reason: error.message };
      }
      if (error instanceof AssistantError) {
        tried.push(`${label}: ${error.message} ${JSON.stringify(error.fieldErrors)}`);
        continue;
      }
      throw error;
    }
  }
  return { status: "skipped", reason: "No hay un tema nuevo que se pueda escribir.", tried };
}
