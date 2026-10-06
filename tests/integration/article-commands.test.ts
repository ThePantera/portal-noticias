import { beforeEach, describe, expect, it } from "vitest";
import { publishDueArticles } from "@/server/jobs/publish-scheduled";
import {
  ArticleError,
  createArticle,
  deleteArticle,
  transitionArticle,
  updateArticle,
  type ArticleInput,
} from "@/server/services/article-commands";
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
  const input = (over: Partial<ArticleInput> = {}): ArticleInput => ({
    title: "Suben las tarifas de luz en diciembre",
    excerpt: "El aumento promedio será del 8%.",
    content: body("El Gobierno confirmó el nuevo cuadro tarifario."),
    categoryId: category.id,
    tags: ["Energía", "Tarifas"],
    ...over,
  });
  return { admin, category, input };
}

const events = (articleId?: string) =>
  testDb.domainEvent.findMany({
    where: articleId ? { aggregateId: articleId } : {},
    orderBy: { occurredAt: "asc" },
    select: { type: true, actorId: true, payload: true },
  });

async function expectError(promise: Promise<unknown>, code: ArticleError["code"]) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ArticleError);
  expect((error as ArticleError).code).toBe(code);
  return error as ArticleError;
}

describe("crear y editar notas", () => {
  it("una nota nueva nace en borrador, con slug, texto buscable, tags y su evento", async () => {
    const { admin, input } = await setup();
    const created = await createArticle(admin, input());

    const article = await testDb.article.findUniqueOrThrow({
      where: { id: created.id },
      include: { tags: { include: { tag: true } } },
    });
    expect(article.status).toBe("DRAFT");
    expect(article.publishedAt).toBeNull();
    expect(article.slug).toBe("suben-las-tarifas-de-luz-en-diciembre");
    expect(article.contentText).toBe("El Gobierno confirmó el nuevo cuadro tarifario.");
    expect(article.tags.map((t) => t.tag.slug).sort()).toEqual(["energia", "tarifas"]);
    expect(article.origin).toBe("MANUAL");

    const [event] = await events(created.id);
    expect(event).toMatchObject({ type: "ARTICLE_CREATED", actorId: admin.id });
  });

  it("dos notas con el mismo título no chocan en la dirección", async () => {
    const { admin, input } = await setup();
    const a = await createArticle(admin, input());
    const b = await createArticle(admin, input());
    expect(b.slug).toBe(`${a.slug}-2`);
  });

  it("guarda el contenido sanitizado: un enlace javascript: no llega a la base", async () => {
    const { admin, input } = await setup();
    const evil = {
      type: "doc",
      content: [
        { type: "html", content: [{ type: "text", text: "<script>alert(1)</script>" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "clic", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] },
          ],
        },
      ],
    };
    const { id } = await createArticle(admin, input({ content: evil }));
    const article = await testDb.article.findUniqueOrThrow({ where: { id } });
    expect(JSON.stringify(article.content)).not.toMatch(/javascript|script/);
    expect(article.content).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "clic" }] }],
    });
  });

  it("rechaza datos inválidos indicando el campo, sin escribir nada", async () => {
    const { admin, input } = await setup();
    const error = await expectError(
      createArticle(admin, input({ title: "  ", categoryId: "no-existe" })),
      "invalid",
    );
    expect(error.fieldErrors.title).toBeDefined();
    expect(await testDb.article.count()).toBe(0);

    const badCategory = await expectError(
      createArticle(admin, input({ categoryId: "no-existe" })),
      "invalid",
    );
    expect(badCategory.fieldErrors.categoryId).toBeDefined();
    expect(await testDb.domainEvent.count()).toBe(0);
  });

  it("un colaborador puede crear pero no editar la nota de otro", async () => {
    const { admin, input } = await setup();
    const { id } = await createArticle(admin, input());
    const contributor = await testDb.user.create({
      data: { email: "colab@test.local", name: "Colab", passwordHash: "!", role: "CONTRIBUTOR" },
    });
    await expectError(updateArticle({ id: contributor.id, role: "CONTRIBUTOR" }, id, input()), "forbidden");
  });

  it("cambiar la dirección de una nota ya publicada guarda la vieja para redirigir", async () => {
    const { admin, input } = await setup();
    const { id, slug } = await createArticle(admin, input());
    await transitionArticle(admin, id, "publish");
    await updateArticle(admin, id, input({ slug: "tarifas-de-luz" }));

    const article = await testDb.article.findUniqueOrThrow({ where: { id } });
    expect(article.slug).toBe("tarifas-de-luz");
    expect(await testDb.articleSlugHistory.findUnique({ where: { slug } })).toMatchObject({ articleId: id });

    // Otra nota no puede quedarse con la dirección vieja.
    const other = await createArticle(admin, input({ title: "Otra" }));
    const error = await expectError(
      updateArticle(admin, other.id, input({ title: "Otra", slug })),
      "invalid",
    );
    expect(error.fieldErrors.slug).toBeDefined();

    // La misma nota sí puede volver a su dirección anterior.
    await updateArticle(admin, id, input({ slug }));
    expect((await testDb.article.findUniqueOrThrow({ where: { id } })).slug).toBe(slug);
    expect(await testDb.articleSlugHistory.findUnique({ where: { slug } })).toBeNull();
  });

  it("un borrador que nunca salió cambia de dirección sin dejar historial", async () => {
    const { admin, input } = await setup();
    const { id } = await createArticle(admin, input());
    await updateArticle(admin, id, input({ slug: "nueva" }));
    expect(await testDb.articleSlugHistory.count()).toBe(0);
  });

  it("sólo una nota ocupa cada puesto destacado", async () => {
    const { admin, input } = await setup();
    const a = await createArticle(admin, input({ featuredRank: 1 }));
    const b = await createArticle(admin, input({ title: "Otra", featuredRank: 1 }));
    expect((await testDb.article.findUniqueOrThrow({ where: { id: a.id } })).featuredRank).toBeNull();
    expect((await testDb.article.findUniqueOrThrow({ where: { id: b.id } })).featuredRank).toBe(1);
  });
});

describe("cambios de estado", () => {
  it("publicar fija la fecha, registra el evento y no se puede repetir", async () => {
    const { admin, input } = await setup();
    const { id } = await createArticle(admin, input());
    const now = new Date("2026-10-06T15:00:00.000Z");
    await transitionArticle(admin, id, "publish", { now });

    const article = await testDb.article.findUniqueOrThrow({ where: { id } });
    expect(article.status).toBe("PUBLISHED");
    expect(article.publishedAt).toEqual(now);
    expect((await events(id)).map((e) => e.type)).toEqual(["ARTICLE_CREATED", "ARTICLE_PUBLISHED"]);

    await expectError(transitionArticle(admin, id, "publish"), "conflict");
  });

  it("no publica sin bajada ni cuerpo, y lo dice campo por campo", async () => {
    const { admin, input } = await setup();
    const { id } = await createArticle(admin, input({ excerpt: "", content: body("") }));
    const error = await expectError(transitionArticle(admin, id, "publish"), "invalid");
    expect(Object.keys(error.fieldErrors).sort()).toEqual(["content", "excerpt"]);
    expect((await testDb.article.findUniqueOrThrow({ where: { id } })).status).toBe("DRAFT");
  });

  it("un autor puede escribir pero no publicar", async () => {
    const { admin, input } = await setup();
    const { id } = await createArticle(admin, input());
    const author = await testDb.user.create({
      data: { email: "autor@test.local", name: "Autor", passwordHash: "!", role: "AUTHOR" },
    });
    await expectError(transitionArticle({ id: author.id, role: "AUTHOR" }, id, "publish"), "forbidden");
    expect((await testDb.article.findUniqueOrThrow({ where: { id } })).status).toBe("DRAFT");
  });

  it("programar exige una fecha futura", async () => {
    const { admin, input } = await setup();
    const { id } = await createArticle(admin, input());
    const now = new Date("2026-10-06T15:00:00.000Z");
    const error = await expectError(
      transitionArticle(admin, id, "schedule", { now, scheduledAt: new Date("2026-10-06T14:59:00.000Z") }),
      "invalid",
    );
    expect(error.fieldErrors.scheduledAt).toBeDefined();

    const at = new Date("2026-10-07T12:00:00.000Z");
    await transitionArticle(admin, id, "schedule", { now, scheduledAt: at });
    const article = await testDb.article.findUniqueOrThrow({ where: { id } });
    expect(article).toMatchObject({ status: "SCHEDULED", scheduledAt: at, publishedAt: null });
  });

  it("despublicar, archivar, restaurar y eliminar siguen la tabla de transiciones", async () => {
    const { admin, input } = await setup();
    const { id } = await createArticle(admin, input({ featuredRank: 1 }));
    await transitionArticle(admin, id, "publish");

    // Una nota publicada no se elimina de un clic.
    await expectError(deleteArticle(admin, id), "conflict");

    await transitionArticle(admin, id, "unpublish");
    expect((await testDb.article.findUniqueOrThrow({ where: { id } })).status).toBe("DRAFT");

    await transitionArticle(admin, id, "archive");
    const archived = await testDb.article.findUniqueOrThrow({ where: { id } });
    expect(archived.status).toBe("ARCHIVED");
    expect(archived.archivedAt).not.toBeNull();
    expect(archived.featuredRank).toBeNull();

    await deleteArticle(admin, id);
    expect(await testDb.article.findUnique({ where: { id } })).toBeNull();

    expect((await events(id)).map((e) => e.type)).toEqual([
      "ARTICLE_CREATED",
      "ARTICLE_PUBLISHED",
      "ARTICLE_UNPUBLISHED",
      "ARTICLE_ARCHIVED",
      "ARTICLE_DELETED",
    ]);
  });

  it("dos publicaciones simultáneas de la misma nota publican una sola vez", async () => {
    const { admin, input } = await setup();
    const { id } = await createArticle(admin, input());
    const results = await Promise.allSettled([
      transitionArticle(admin, id, "publish"),
      transitionArticle(admin, id, "publish"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await events(id)).filter((e) => e.type === "ARTICLE_PUBLISHED")).toHaveLength(1);
  });
});

describe("publicador de notas programadas", () => {
  it("publica sólo las vencidas, con la fecha programada, y es idempotente", async () => {
    const { admin, input } = await setup();
    const now = new Date("2026-10-06T15:00:00.000Z");
    const due = await createArticle(admin, input({ title: "Vencida" }));
    const later = await createArticle(admin, input({ title: "Más tarde" }));
    const dueAt = new Date("2026-10-06T14:30:00.000Z");
    await transitionArticle(admin, due.id, "schedule", {
      now: new Date("2026-10-06T10:00:00.000Z"),
      scheduledAt: dueAt,
    });
    await transitionArticle(admin, later.id, "schedule", {
      now,
      scheduledAt: new Date("2026-10-06T18:00:00.000Z"),
    });

    const published = await publishDueArticles(now);
    expect(published.map((a) => a.id)).toEqual([due.id]);
    expect(await publishDueArticles(now)).toEqual([]);

    const article = await testDb.article.findUniqueOrThrow({ where: { id: due.id } });
    expect(article).toMatchObject({ status: "PUBLISHED", publishedAt: dueAt, scheduledAt: null });
    expect((await testDb.article.findUniqueOrThrow({ where: { id: later.id } })).status).toBe("SCHEDULED");

    const publishedEvents = (await events(due.id)).filter((e) => e.type === "ARTICLE_PUBLISHED");
    expect(publishedEvents).toHaveLength(1);
    expect(publishedEvents[0]).toMatchObject({
      actorId: null,
      payload: { trigger: "scheduler", from: "SCHEDULED" },
    });
  });

  it("dos ejecuciones simultáneas no publican dos veces", async () => {
    const { admin, input } = await setup();
    const { id } = await createArticle(admin, input());
    await transitionArticle(admin, id, "schedule", {
      now: new Date("2026-10-06T10:00:00.000Z"),
      scheduledAt: new Date("2026-10-06T11:00:00.000Z"),
    });
    const now = new Date("2026-10-06T12:00:00.000Z");
    const [a, b] = await Promise.all([publishDueArticles(now), publishDueArticles(now)]);
    expect(a.length + b.length).toBe(1);
    expect((await events(id)).filter((e) => e.type === "ARTICLE_PUBLISHED")).toHaveLength(1);
  });
});
