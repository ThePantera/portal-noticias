import { beforeEach, describe, expect, it } from "vitest";
import {
  createArticle,
  transitionArticle,
  updateArticle,
  type ArticleInput,
} from "@/server/services/article-commands";
import {
  findPublishedArticle,
  getCategoryPage,
  getHomepage,
  getTagPage,
  listFeedArticles,
  listNavCategories,
  listNewsSitemapArticles,
  listSitemapEntries,
  listRelatedArticles,
  PUBLIC_PAGE_SIZE,
  searchArticles,
} from "@/server/services/public-queries";
import { createAuthorAndCategory, resetDatabase, testDb } from "./setup/db";

beforeEach(resetDatabase);

const body = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

async function setup() {
  const { author, category } = await createAuthorAndCategory();
  await testDb.user.update({ where: { id: author.id }, data: { role: "ADMIN" } });
  const admin = { id: author.id, role: "ADMIN" as const };
  let n = 0;
  const input = (over: Partial<ArticleInput> = {}): ArticleInput => {
    n++;
    return {
      title: `Nota número ${n}`,
      excerpt: "Una bajada.",
      content: body("Texto del cuerpo."),
      categoryId: category.id,
      tags: [],
      ...over,
    };
  };
  /** Crea una nota y la publica, con fechas separadas para que el orden sea estable. */
  const publish = async (over: Partial<ArticleInput> = {}, minutesAgo = 0) => {
    const { id } = await createArticle(admin, input(over));
    await transitionArticle(admin, id, "publish", { now: new Date(Date.now() - minutesAgo * 60_000) });
    return id;
  };
  const draft = async (over: Partial<ArticleInput> = {}) => (await createArticle(admin, input(over))).id;
  return { admin, category, input, publish, draft };
}

describe("sitio público", () => {
  it("sólo muestra notas publicadas, en ningún listado ni por dirección", async () => {
    const { admin, category, publish, draft } = await setup();
    await publish({ title: "Publicada sobre el puerto", tags: ["Puerto"] });
    const draftId = await draft({ title: "Borrador sobre el puerto", tags: ["Puerto"] });
    const scheduledId = await draft({ title: "Programada sobre el puerto", tags: ["Puerto"] });
    await transitionArticle(admin, scheduledId, "schedule", {
      scheduledAt: new Date(Date.now() + 3_600_000),
    });
    const archivedId = await publish({ title: "Archivada sobre el puerto", tags: ["Puerto"] });
    await transitionArticle(admin, archivedId, "archive");

    const home = await getHomepage();
    const homeTitles = [home.lead, ...home.secondary, ...home.latest].map((a) => a?.title);
    expect(homeTitles).toEqual(["Publicada sobre el puerto"]);

    const section = await getCategoryPage(category.slug);
    expect(section?.articles.map((a) => a.title)).toEqual(["Publicada sobre el puerto"]);
    expect((await getTagPage("puerto"))?.total).toBe(1);
    expect((await searchArticles("puerto")).articles.map((a) => a.title)).toEqual([
      "Publicada sobre el puerto",
    ]);

    for (const id of [draftId, scheduledId, archivedId]) {
      const { slug } = await testDb.article.findUniqueOrThrow({ where: { id } });
      expect(await findPublishedArticle(slug)).toEqual({ kind: "missing" });
    }
  });

  it("la principal es la destacada 1 y el resto se completa con las más recientes", async () => {
    const { publish } = await setup();
    await publish({ title: "Vieja destacada", featuredRank: 1 }, 600);
    await publish({ title: "Reciente" }, 1);
    await publish({ title: "Segunda destacada", featuredRank: 2 }, 300);
    await publish({ title: "Anterior" }, 120);

    const home = await getHomepage();
    expect(home.lead?.title).toBe("Vieja destacada");
    expect(home.secondary.map((a) => a.title)).toEqual(["Segunda destacada", "Reciente", "Anterior"]);
    expect(home.latest).toEqual([]);
  });

  it("los bloques por sección no repiten las notas de arriba", async () => {
    const { publish } = await setup();
    for (let i = 0; i < 15; i++) await publish({}, i);
    const home = await getHomepage();
    const top = [home.lead, ...home.secondary, ...home.latest].map((a) => a?.id);
    expect(top).toHaveLength(12);
    const inSections = home.sections.flatMap((s) => s.articles.map((a) => a.id));
    expect(inSections).toHaveLength(3);
    expect(inSections.some((id) => top.includes(id))).toBe(false);
  });

  it("una dirección vieja redirige a la nueva", async () => {
    const { admin, publish, input } = await setup();
    const id = await publish({ title: "Título original" });
    await updateArticle(admin, id, input({ title: "Título corregido", slug: "titulo-corregido" }));

    expect(await findPublishedArticle("titulo-original")).toEqual({
      kind: "redirect",
      slug: "titulo-corregido",
    });
    const found = await findPublishedArticle("titulo-corregido");
    expect(found.kind === "article" && found.article.title).toBe("Título corregido");

    // Si la nota se despublica, la dirección vieja tampoco lleva a ningún lado.
    await transitionArticle(admin, id, "unpublish");
    expect(await findPublishedArticle("titulo-original")).toEqual({ kind: "missing" });
  });

  it("la búsqueda no distingue tildes, ordena por relevancia y trata el texto como dato", async () => {
    const { publish } = await setup();
    await publish({ title: "Debate por la inflación", content: body("Precios.") }, 10);
    await publish({ title: "Otra nota", excerpt: "Menciona la inflacion de pasada." }, 1);

    const result = await searchArticles("INFLACION");
    expect(result.total).toBe(2);
    expect(result.articles[0].title).toBe("Debate por la inflación");

    for (const hostile of [
      "'; DROP TABLE articles; --",
      "inflación) OR (1=1",
      '"sin cerrar',
      "!!! &&& |||",
    ]) {
      await expect(searchArticles(hostile)).resolves.toMatchObject({ page: 1 });
    }
    expect(await testDb.article.count()).toBe(2);
    expect((await searchArticles("   ")).total).toBe(0);
  });

  it("pagina los resultados", async () => {
    const { category, publish } = await setup();
    for (let i = 0; i < PUBLIC_PAGE_SIZE + 2; i++) await publish({ title: `Represa ${i}` }, i);

    const first = await getCategoryPage(category.slug, 1);
    const second = await getCategoryPage(category.slug, 2);
    expect(first?.pageCount).toBe(2);
    expect(first?.articles).toHaveLength(PUBLIC_PAGE_SIZE);
    expect(second?.articles.map((a) => a.title)).toEqual([
      `Represa ${PUBLIC_PAGE_SIZE}`,
      `Represa ${PUBLIC_PAGE_SIZE + 1}`,
    ]);
    expect((await searchArticles("represa", 2)).articles).toHaveLength(2);
  });

  it("las relacionadas priorizan etiquetas compartidas y nunca incluyen la misma nota", async () => {
    const { publish } = await setup();
    const id = await publish({ tags: ["Litio"] }, 5);
    const sameTag = await publish({ title: "Con la misma etiqueta", tags: ["Litio"] }, 100);
    await publish({ title: "Sólo misma sección" }, 1);

    const related = await listRelatedArticles(id);
    expect(related.map((a) => a.id)[0]).toBe(sameTag);
    expect(related.map((a) => a.title)).toEqual(["Con la misma etiqueta", "Sólo misma sección"]);
    expect(related.some((a) => a.id === id)).toBe(false);
  });

  it("una sección desactivada no se navega ni se muestra", async () => {
    const { category, publish } = await setup();
    await publish();
    expect((await listNavCategories()).map((c) => c.slug)).toContain(category.slug);
    await testDb.category.update({ where: { id: category.id }, data: { isActive: false } });
    expect(await listNavCategories()).toEqual([]);
    expect(await getCategoryPage(category.slug)).toBeNull();
  });

  it("sitemaps y RSS sólo listan lo publicado; el de noticias, las últimas 48 horas", async () => {
    const { admin, publish, draft } = await setup();
    await publish({ title: "Hoy", tags: ["Visible"] }, 60);
    await publish({ title: "Hace tres días" }, 3 * 24 * 60);
    await draft({ title: "Borrador", tags: ["Oculta"] });
    const archived = await publish({ title: "Archivada" });
    await transitionArticle(admin, archived, "archive");

    const { articles, tags } = await listSitemapEntries();
    expect(articles.map((a) => a.slug).sort()).toEqual(["hace-tres-dias", "hoy"]);
    expect(tags.map((t) => t.slug)).toEqual(["visible"]);
    expect((await listNewsSitemapArticles(new Date())).map((a) => a.title)).toEqual(["Hoy"]);
    expect((await listFeedArticles()).map((a) => a.title)).toEqual(["Hoy", "Hace tres días"]);
  });
});
