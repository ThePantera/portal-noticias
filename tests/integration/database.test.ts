import { beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { createAuthorAndCategory, resetDatabase, testDb } from "./setup/db";

beforeEach(resetDatabase);

async function search(query: string): Promise<string[]> {
  const rows = await testDb.$queryRaw<{ slug: string }[]>`
    SELECT slug FROM articles
    WHERE search_vector @@ websearch_to_tsquery('spanish', f_unaccent(${query}))
    ORDER BY ts_rank(search_vector, websearch_to_tsquery('spanish', f_unaccent(${query}))) DESC`;
  return rows.map((r) => r.slug);
}

describe("búsqueda de texto completo", () => {
  it("encuentra sin acentos, por raíz y en el cuerpo, y se actualiza al editar", async () => {
    const { author, category } = await createAuthorAndCategory();
    await testDb.article.create({
      data: {
        title: "Nuevas medidas económicas",
        slug: "nuevas-medidas",
        excerpt: "Anuncio del ministerio",
        content: {},
        contentText: "La inflación de septiembre fue menor a la esperada.",
        categoryId: category.id,
        authorId: author.id,
      },
    });

    expect(await search("economica")).toEqual(["nuevas-medidas"]);
    expect(await search("medida")).toEqual(["nuevas-medidas"]);
    expect(await search("inflacion")).toEqual(["nuevas-medidas"]);
    expect(await search("futbol")).toEqual([]);

    await testDb.article.update({
      where: { slug: "nuevas-medidas" },
      data: { contentText: "Crónica del fútbol" },
    });
    expect(await search("futbol")).toEqual(["nuevas-medidas"]);
    expect(await search("inflacion")).toEqual([]);
  });

  it("pondera el título por encima del cuerpo", async () => {
    const { author, category } = await createAuthorAndCategory();
    const base = { content: {}, categoryId: category.id, authorId: author.id, excerpt: "" };
    await testDb.article.create({
      data: { ...base, title: "Otra nota", slug: "en-cuerpo", contentText: "Habla del satélite." },
    });
    await testDb.article.create({
      data: { ...base, title: "Lanzan un satélite", slug: "en-titulo", contentText: "" },
    });
    expect(await search("satelite")).toEqual(["en-titulo", "en-cuerpo"]);
  });

  it("trata la búsqueda como texto, no como SQL", async () => {
    await expect(search("'; DROP TABLE articles; --")).resolves.toEqual([]);
    expect(await testDb.article.count()).toBe(0);
  });
});

describe("integridad", () => {
  it("rechaza slugs duplicados", async () => {
    const { author, category } = await createAuthorAndCategory();
    const data = {
      title: "A",
      slug: "repetido",
      excerpt: "",
      content: {},
      categoryId: category.id,
      authorId: author.id,
    };
    await testDb.article.create({ data });
    await expect(testDb.article.create({ data })).rejects.toMatchObject({ code: "P2002" });
  });

  it("no permite borrar una categoría con notas, sí una vacía", async () => {
    const { author, category } = await createAuthorAndCategory();
    await testDb.article.create({
      data: { title: "A", slug: "a", excerpt: "", content: {}, categoryId: category.id, authorId: author.id },
    });
    await expect(testDb.category.delete({ where: { id: category.id } })).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );

    const empty = await testDb.category.create({ data: { name: "Vacía", slug: "vacia" } });
    await expect(testDb.category.delete({ where: { id: empty.id } })).resolves.toMatchObject({
      slug: "vacia",
    });
  });

  it("al borrar una nota se borran sus tags asociados pero no los tags", async () => {
    const { author, category } = await createAuthorAndCategory();
    const tag = await testDb.tag.create({ data: { name: "Apple", slug: "apple" } });
    const article = await testDb.article.create({
      data: {
        title: "A",
        slug: "a",
        excerpt: "",
        content: {},
        categoryId: category.id,
        authorId: author.id,
        tags: { create: [{ tagId: tag.id }] },
      },
    });
    await testDb.article.delete({ where: { id: article.id } });
    expect(await testDb.articleTag.count()).toBe(0);
    expect(await testDb.tag.count()).toBe(1);
  });

  it("usa DRAFT y MANUAL por defecto", async () => {
    const { author, category } = await createAuthorAndCategory();
    const article = await testDb.article.create({
      data: { title: "A", slug: "a", excerpt: "", content: {}, categoryId: category.id, authorId: author.id },
    });
    expect(article.status).toBe("DRAFT");
    expect(article.origin).toBe("MANUAL");
    expect(article.publishedAt).toBeNull();
  });
});
