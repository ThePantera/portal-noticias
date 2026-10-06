import { beforeEach, describe, expect, it } from "vitest";
import { countArticlesByStatus, countOverdueScheduled, listRecentArticles } from "@/server/services/articles";
import { createAuthorAndCategory, resetDatabase, testDb } from "./setup/db";

beforeEach(resetDatabase);

async function seedArticles() {
  const { author, category } = await createAuthorAndCategory();
  const base = { excerpt: "", content: {}, categoryId: category.id, authorId: author.id };
  const past = new Date(Date.now() - 60_000);
  const future = new Date(Date.now() + 86_400_000);
  await testDb.article.createMany({
    data: [
      { ...base, title: "Publicada 1", slug: "p1", status: "PUBLISHED", publishedAt: past },
      { ...base, title: "Publicada 2", slug: "p2", status: "PUBLISHED", publishedAt: past },
      { ...base, title: "Borrador", slug: "b1", status: "DRAFT" },
      { ...base, title: "Programada a futuro", slug: "s1", status: "SCHEDULED", scheduledAt: future },
      { ...base, title: "Programada vencida", slug: "s2", status: "SCHEDULED", scheduledAt: past },
      { ...base, title: "Archivada", slug: "a1", status: "ARCHIVED", publishedAt: past },
    ],
  });
  return { author, category };
}

describe("conteos del tablero", () => {
  it("cuenta por estado y el total", async () => {
    await seedArticles();
    expect(await countArticlesByStatus()).toEqual({
      PUBLISHED: 2,
      DRAFT: 1,
      SCHEDULED: 2,
      ARCHIVED: 1,
      total: 6,
    });
  });

  it("con la base vacía devuelve ceros, no errores", async () => {
    expect(await countArticlesByStatus()).toEqual({
      PUBLISHED: 0,
      DRAFT: 0,
      SCHEDULED: 0,
      ARCHIVED: 0,
      total: 0,
    });
    expect(await countOverdueScheduled()).toBe(0);
    expect(await listRecentArticles()).toEqual([]);
  });

  it("avisa de las programadas cuya hora ya pasó", async () => {
    await seedArticles();
    expect(await countOverdueScheduled()).toBe(1);
  });

  it("no cuenta como vencida una programada que ya se publicó", async () => {
    const { author, category } = await createAuthorAndCategory();
    await testDb.article.create({
      data: {
        title: "Ya salió",
        slug: "ya-salio",
        excerpt: "",
        content: {},
        categoryId: category.id,
        authorId: author.id,
        status: "PUBLISHED",
        scheduledAt: new Date(Date.now() - 60_000),
        publishedAt: new Date(Date.now() - 60_000),
      },
    });
    expect(await countOverdueScheduled()).toBe(0);
  });
});

describe("últimas notas editadas", () => {
  it("ordena por última edición y trae categoría y autor", async () => {
    await seedArticles();
    await testDb.article.update({ where: { slug: "b1" }, data: { title: "Borrador editado" } });
    const rows = await listRecentArticles(3);
    expect(rows).toHaveLength(3);
    expect(rows[0].title).toBe("Borrador editado");
    expect(rows[0].categoryName).toMatch(/^Categoría/);
    expect(rows[0].authorName).toBe("Autor");
  });

  it("respeta el límite y no expone el contenido completo", async () => {
    await seedArticles();
    const rows = await listRecentArticles(2);
    expect(rows).toHaveLength(2);
    expect(rows[0]).not.toHaveProperty("content");
    expect(rows[0]).not.toHaveProperty("contentText");
  });
});
