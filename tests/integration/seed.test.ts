import { beforeEach, describe, expect, it } from "vitest";
import { INITIAL_CATEGORIES } from "../../prisma/data/categories";
import { DEMO_ARTICLES } from "../../prisma/data/demo-articles";
import { seedCategories } from "../../prisma/seeders/categories";
import { DEMO_AUTHOR_EMAIL, seedDemo } from "../../prisma/seeders/demo";
import { resetDatabase, testDb } from "./setup/db";

beforeEach(resetDatabase);

describe("seed de categorías", () => {
  it("crea las 10 categorías en orden y es idempotente", async () => {
    expect(await seedCategories(testDb)).toBe(10);
    expect(await seedCategories(testDb)).toBe(0);
    const categories = await testDb.category.findMany({ orderBy: { sortOrder: "asc" } });
    expect(categories.map((c) => c.slug)).toEqual(INITIAL_CATEGORIES.map((c) => c.slug));
  });

  it("no pisa una categoría editada desde el panel", async () => {
    await seedCategories(testDb);
    await testDb.category.update({ where: { slug: "politica" }, data: { name: "Política nacional" } });
    await seedCategories(testDb);
    expect((await testDb.category.findUnique({ where: { slug: "politica" } }))?.name).toBe(
      "Política nacional",
    );
  });
});

describe("seed de demo", () => {
  it("crea notas en todos los estados, con tags y texto buscable, sin duplicar", async () => {
    await seedCategories(testDb);
    expect(await seedDemo(testDb)).toBe(DEMO_ARTICLES.length);
    expect(await seedDemo(testDb)).toBe(0);

    const byStatus = await testDb.article.groupBy({ by: ["status"], _count: true });
    expect(Object.fromEntries(byStatus.map((s) => [s.status, s._count]))).toEqual({
      PUBLISHED: 10,
      DRAFT: 1,
      SCHEDULED: 1,
      ARCHIVED: 1,
    });

    const lead = await testDb.article.findFirst({ where: { featuredRank: 1 }, include: { tags: true } });
    expect(lead?.status).toBe("PUBLISHED");
    expect(lead?.tags.length).toBeGreaterThan(0);
    expect(lead?.contentText.length).toBeGreaterThan(0);

    const scheduled = await testDb.article.findFirst({ where: { status: "SCHEDULED" } });
    expect(scheduled?.publishedAt).toBeNull();
    expect(scheduled?.scheduledAt?.getTime()).toBeGreaterThan(Date.now());

    const [{ count }] = await testDb.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) FROM articles WHERE search_vector @@ websearch_to_tsquery('spanish', f_unaccent('inflacion'))`;
    expect(Number(count)).toBe(1);
  });

  it("el autor de demo no puede iniciar sesión", async () => {
    await seedCategories(testDb);
    await seedDemo(testDb);
    const author = await testDb.user.findUnique({ where: { email: DEMO_AUTHOR_EMAIL } });
    expect(author?.isActive).toBe(false);
    expect(author?.passwordHash.startsWith("$argon2")).toBe(false);
  });
});
