import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { localDriver, setStorageDriverForTests } from "@/server/media/storage";
import {
  ASSISTANT_EMAIL,
  MAX_ARTICLES_PER_DAY,
  assistantActor,
  createAssistantArticle,
  deleteAssistantArticle,
  getAssistantArticle,
  listLatestArticles,
  updateAssistantArticle,
} from "@/server/services/assistant-articles";
import { createArticle } from "@/server/services/article-commands";
import { findPublishedArticle } from "@/server/services/public-queries";
import { verifyPassword } from "@/server/auth/password";
import { createAuthorAndCategory, resetDatabase, testDb } from "./setup/db";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "portal-assistant-"));
  setStorageDriverForTests(localDriver(dir));
});
afterAll(async () => {
  setStorageDriverForTests(null);
  await rm(dir, { recursive: true, force: true });
});
beforeEach(resetDatabase);

const body = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

async function setup() {
  const { author, category } = await createAuthorAndCategory();
  return { author, category };
}

function draft(category: string, extra: Record<string, unknown> = {}) {
  return {
    title: "El subte suma frecuencias en la línea B",
    excerpt: "La medida rige desde el lunes en hora pico.",
    content: body("Según el anuncio oficial, los trenes pasarán cada tres minutos."),
    category,
    tags: ["Subte", "CABA"],
    sources: [{ name: "Buenos Aires Ciudad", url: "https://buenosaires.gob.ar/noticias/subte" }],
    ...extra,
  };
}

async function photoBase64() {
  const png = await sharp({ create: { width: 1600, height: 900, channels: 3, background: "#336699" } })
    .jpeg()
    .toBuffer();
  return png.toString("base64");
}

describe("API del asistente", () => {
  it("crea un borrador AI_ASSISTED con las fuentes citadas al final", async () => {
    const { category } = await setup();
    const created = await createAssistantArticle(draft(category.slug));
    expect(created.status).toBe("DRAFT");

    const article = await getAssistantArticle(created.id);
    expect(article?.origin).toBe("AI_ASSISTED");
    expect(article?.authorName).toBe("Redacción");
    const last = article?.content.content?.at(-1);
    expect(JSON.stringify(last)).toContain("Fuentes: ");
    expect(JSON.stringify(last)).toContain("https://buenosaires.gob.ar/noticias/subte");
  });

  it("su usuario no puede iniciar sesión", async () => {
    await assistantActor();
    const user = await testDb.user.findUniqueOrThrow({ where: { email: ASSISTANT_EMAIL } });
    expect(user.isActive).toBe(false);
    expect(user.role).toBe("EDITOR");
    expect(await verifyPassword(user.passwordHash, "!")).toBe(false);
  });

  it("publica en el momento y la nota aparece en el sitio", async () => {
    const { category } = await setup();
    const created = await createAssistantArticle(draft(category.slug, { action: "publish" }));
    expect(created.status).toBe("PUBLISHED");
    const found = await findPublishedArticle(created.slug);
    expect(found.kind).toBe("article");
  });

  it("programa con fecha y zona horaria", async () => {
    const { category } = await setup();
    const at = new Date(Date.now() + 3 * 60 * 60_000);
    const created = await createAssistantArticle(
      draft(category.slug, { action: "schedule", scheduledAt: at.toISOString().replace("Z", "+00:00") }),
    );
    expect(created.status).toBe("SCHEDULED");
    const row = await testDb.article.findUniqueOrThrow({ where: { id: created.id } });
    expect(row.scheduledAt?.getTime()).toBe(at.getTime());
  });

  it("no programa sin fecha ni en el pasado; en el pasado la deja en borrador", async () => {
    const { category } = await setup();
    await expect(createAssistantArticle(draft(category.slug, { action: "schedule" }))).rejects.toMatchObject({
      code: "invalid",
      fieldErrors: { scheduledAt: "Para programar hace falta la fecha." },
    });
    await expect(
      createAssistantArticle(
        draft(category.slug, { action: "schedule", scheduledAt: "2020-01-01T08:00:00-03:00" }),
      ),
    ).rejects.toMatchObject({
      code: "invalid",
      fieldErrors: { scheduledAt: "Elegí una fecha y hora futuras." },
    });
    const rows = await testDb.article.findMany({ select: { status: true } });
    expect(rows).toEqual([{ status: "DRAFT" }]);
  });

  it("exige fuentes, sección válida y crédito en la foto", async () => {
    const { category } = await setup();
    await expect(createAssistantArticle(draft(category.slug, { sources: [] }))).rejects.toMatchObject({
      code: "invalid",
    });
    await expect(createAssistantArticle(draft("no-existe"))).rejects.toMatchObject({
      fieldErrors: { category: "No existe esa sección." },
    });
    await expect(
      createAssistantArticle(draft(category.slug, { image: { data: await photoBase64(), alt: "Un tren" } })),
    ).rejects.toMatchObject({ fieldErrors: { "image.credit": expect.any(String) } });
    await expect(
      createAssistantArticle(draft(category.slug, { sources: [{ name: "X", url: "javascript:alert(1)" }] })),
    ).rejects.toMatchObject({ code: "invalid" });
    expect(await testDb.article.count()).toBe(0);
  });

  it("sube la foto con su descripción y crédito", async () => {
    const { category } = await setup();
    const created = await createAssistantArticle(
      draft(category.slug, {
        image: { data: await photoBase64(), alt: "Un tren en el andén", credit: "Foto: GCBA (CC BY 2.5 AR)" },
        action: "publish",
      }),
    );
    const article = await getAssistantArticle(created.id);
    expect(article?.mainImage).toMatchObject({
      alt: "Un tren en el andén",
      credit: "Foto: GCBA (CC BY 2.5 AR)",
    });
  });

  it("rechaza una imagen que no es imagen", async () => {
    const { category } = await setup();
    const fake = Buffer.from("<svg onload=alert(1)>").toString("base64");
    await expect(
      createAssistantArticle(draft(category.slug, { image: { data: fake, alt: "x", credit: "y" } })),
    ).rejects.toMatchObject({ code: "invalid" });
    expect(await testDb.article.count()).toBe(0);
  });

  it("corrige sólo lo que se manda y conserva el resto", async () => {
    const { category } = await setup();
    const created = await createAssistantArticle(draft(category.slug, { action: "publish" }));
    const updated = await updateAssistantArticle(created.id, {
      title: "El subte suma frecuencias en las líneas B y D",
    });
    expect(updated.status).toBe("PUBLISHED");

    const article = await getAssistantArticle(created.id);
    expect(article?.title).toBe("El subte suma frecuencias en las líneas B y D");
    expect(article?.excerpt).toBe("La medida rige desde el lunes en hora pico.");
    expect(article?.tags.sort()).toEqual(["CABA", "Subte"]);
    // El cuerpo no se tocó: las fuentes siguen una sola vez.
    expect(JSON.stringify(article?.content).match(/Fuentes: /g)).toHaveLength(1);
    // La dirección vieja sigue llevando a la nota.
    expect(await findPublishedArticle(created.slug)).toMatchObject({ kind: "article" });
  });

  it("puede corregir una nota escrita a mano en el panel", async () => {
    const { author, category } = await setup();
    const manual = await createArticle(
      { id: author.id, role: "ADMIN" },
      {
        title: "Nota de Manu",
        excerpt: "Bajada",
        content: body("Cuerpo"),
        categoryId: category.id,
      },
    );
    await updateAssistantArticle(manual.id, { excerpt: "Bajada corregida", action: "publish" });
    const article = await getAssistantArticle(manual.id);
    expect(article).toMatchObject({ excerpt: "Bajada corregida", status: "PUBLISHED", origin: "MANUAL" });
  });

  it("despublica, archiva y reprograma", async () => {
    const { category } = await setup();
    const { id } = await createAssistantArticle(draft(category.slug, { action: "publish" }));
    expect((await updateAssistantArticle(id, { action: "unpublish" })).status).toBe("DRAFT");
    const later = new Date(Date.now() + 60 * 60_000).toISOString();
    expect((await updateAssistantArticle(id, { action: "schedule", scheduledAt: later })).status).toBe(
      "SCHEDULED",
    );
    expect((await updateAssistantArticle(id, { action: "archive" })).status).toBe("ARCHIVED");
  });

  it("elimina una nota publicada archivándola antes", async () => {
    const { category } = await setup();
    const { id, slug } = await createAssistantArticle(draft(category.slug, { action: "publish" }));
    await deleteAssistantArticle(id);
    expect(await testDb.article.count()).toBe(0);
    expect((await findPublishedArticle(slug)).kind).toBe("missing");
    const events = await testDb.domainEvent.findMany({
      select: { type: true },
      orderBy: { occurredAt: "asc" },
    });
    expect(events.map((e) => e.type)).toEqual([
      "ARTICLE_CREATED",
      "ARTICLE_PUBLISHED",
      "ARTICLE_ARCHIVED",
      "ARTICLE_DELETED",
    ]);
  });

  it("avisa si la nota no existe", async () => {
    await expect(updateAssistantArticle("nada", { title: "x" })).rejects.toMatchObject({ code: "not-found" });
    await expect(deleteAssistantArticle("nada")).rejects.toMatchObject({ code: "not-found" });
  });

  it("corta en el tope diario de notas nuevas", async () => {
    const { category } = await setup();
    const actor = await assistantActor();
    await testDb.article.createMany({
      data: Array.from({ length: MAX_ARTICLES_PER_DAY }, (_, i) => ({
        title: `Nota ${i}`,
        slug: `nota-${i}`,
        excerpt: "",
        content: body("x"),
        categoryId: category.id,
        authorId: actor.id,
      })),
    });
    await expect(createAssistantArticle(draft(category.slug))).rejects.toMatchObject({
      code: "rate-limited",
    });
  });

  it("lista las últimas notas de todos los autores", async () => {
    const { author, category } = await setup();
    await createArticle(
      { id: author.id, role: "ADMIN" },
      { title: "A mano", content: body("x"), categoryId: category.id },
    );
    await createAssistantArticle(draft(category.slug));
    const list = await listLatestArticles();
    expect(list.map((a) => a.origin).sort()).toEqual(["AI_ASSISTED", "MANUAL"]);
  });
});

describe("fotos de Wikimedia Commons", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubCommons(license: string, photo: Buffer) {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (input: string | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.startsWith("https://commons.wikimedia.org/")) {
        return Response.json({
          query: {
            pages: [
              {
                index: 1,
                title: "File:Obelisco.jpg",
                imageinfo: [
                  {
                    thumburl:
                      "https://upload.wikimedia.org/wikipedia/commons/thumb/o/ob/Obelisco.jpg/1600px-Obelisco.jpg",
                    descriptionurl: "https://commons.wikimedia.org/wiki/File:Obelisco.jpg",
                    mime: "image/jpeg",
                    extmetadata: { LicenseShortName: { value: license }, Artist: { value: "Ana Pérez" } },
                  },
                ],
              },
            ],
          },
        });
      }
      if (url.startsWith("https://upload.wikimedia.org/")) return new Response(new Uint8Array(photo));
      throw new Error(`fetch inesperado: ${url}`);
    });
    return calls;
  }

  it("descarga la foto, la sube y arma el crédito con autor y licencia", async () => {
    const { category } = await setup();
    const calls = stubCommons("CC BY-SA 4.0", Buffer.from(await photoBase64(), "base64"));
    const created = await createAssistantArticle(
      draft(category.slug, { image: { commons: "File:Obelisco.jpg", alt: "El Obelisco" } }),
    );
    const article = await getAssistantArticle(created.id);
    expect(article?.mainImage).toMatchObject({
      alt: "El Obelisco",
      credit: "Ana Pérez / Wikimedia Commons, CC BY-SA 4.0",
    });
    expect(calls.some((url) => url.includes("titles=File%3AObelisco.jpg"))).toBe(true);
  });

  it("cambia sólo la foto de una nota existente", async () => {
    const { category } = await setup();
    const created = await createAssistantArticle(draft(category.slug));
    stubCommons("CC0", Buffer.from(await photoBase64(), "base64"));
    await updateAssistantArticle(created.id, { image: { commons: "File:Obelisco.jpg", alt: "El Obelisco" } });
    const article = await getAssistantArticle(created.id);
    expect(article?.title).toBe(created.title);
    expect(article?.mainImage?.credit).toBe("Ana Pérez / Wikimedia Commons, CC0");
  });

  it("rechaza una foto con licencia no comercial y no guarda la nota", async () => {
    const { category } = await setup();
    stubCommons("CC BY-NC 2.0", Buffer.from(await photoBase64(), "base64"));
    await expect(
      createAssistantArticle(draft(category.slug, { image: { commons: "File:Obelisco.jpg", alt: "x" } })),
    ).rejects.toMatchObject({ code: "invalid", fieldErrors: { "image.commons": expect.any(String) } });
    expect(await testDb.article.count()).toBe(0);
  });

  it("pide una sola forma de imagen", async () => {
    const { category } = await setup();
    await expect(
      createAssistantArticle(
        draft(category.slug, {
          image: { data: await photoBase64(), commons: "File:X.jpg", alt: "x", credit: "y" },
        }),
      ),
    ).rejects.toMatchObject({ code: "invalid" });
  });
});
