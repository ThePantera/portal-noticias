import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createArticle, transitionArticle, updateArticle } from "@/server/services/article-commands";
import { localDriver, setStorageDriverForTests } from "@/server/media/storage";
import { MediaError, uploadImage } from "@/server/services/media";
import { getHomepage, findPublishedArticle } from "@/server/services/public-queries";
import { getArticleForEdit } from "@/server/services/articles";
import { createAuthorAndCategory, resetDatabase, testDb } from "./setup/db";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "portal-media-"));
  setStorageDriverForTests(localDriver(dir));
});
afterAll(async () => {
  setStorageDriverForTests(null);
  await rm(dir, { recursive: true, force: true });
});
beforeEach(resetDatabase);

async function admin() {
  const { author, category } = await createAuthorAndCategory();
  await testDb.user.update({ where: { id: author.id }, data: { role: "ADMIN" } });
  return { actor: { id: author.id, role: "ADMIN" as const }, category };
}

/** Foto de prueba con EXIF de cámara (incluida una "ubicación" en el comentario). */
function photo(width = 2000, height = 1200, format: "jpeg" | "png" = "jpeg") {
  const img = sharp({
    create: { width, height, channels: 3, background: { r: 30, g: 90, b: 120 } },
  }).withExif({
    IFD0: { Make: "Camara de prueba", ImageDescription: "GPS -34.6, -58.4" },
  });
  return (format === "jpeg" ? img.jpeg() : img.png()).toBuffer();
}

const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Cuerpo." }] }] };

describe("subida de imágenes", () => {
  it("guarda el original sin metadatos, las variantes y el recorte para redes", async () => {
    const { actor } = await admin();
    const image = await uploadImage(actor, await photo());

    const row = await testDb.media.findUniqueOrThrow({ where: { id: image.id } });
    expect(row).toMatchObject({ storageDriver: "local", mimeType: "image/jpeg", width: 2000, height: 1200 });
    expect(row.storageKey).toMatch(/^media\/\d{4}\/\d{2}\/[0-9a-f-]{36}\/original\.jpg$/);

    const folder = path.join(dir, path.dirname(row.storageKey));
    expect((await readdir(folder)).sort()).toEqual(
      ["og.jpg", "original.jpg", "w1600.webp", "w2000.webp", "w480.webp", "w960.webp"].sort(),
    );
    const original = await sharp(await readFile(path.join(dir, row.storageKey))).metadata();
    expect(original.exif).toBeUndefined();
    const og = await sharp(await readFile(path.join(folder, "og.jpg"))).metadata();
    expect([og.width, og.height]).toEqual([1200, 630]);

    expect(image.src).toMatch(/\/w960\.webp$/);
    expect(image.srcSet.split(", ")).toHaveLength(4);
    expect(image.ogUrl).toMatch(/\/og\.jpg$/);
  });

  it("endereza las fotos según la orientación de la cámara", async () => {
    const { actor } = await admin();
    const rotated = await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#888" } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const image = await uploadImage(actor, rotated);
    const row = await testDb.media.findUniqueOrThrow({ where: { id: image.id } });
    expect([row.width, row.height]).toEqual([800, 1200]);
  });

  it.each([
    ["un texto renombrado", Buffer.from("no soy una imagen"), /JPG, PNG, WebP o AVIF/],
    ["un SVG", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), /JPG/],
    ["un JPEG roto", Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 7)]), /dañada/],
    ["un archivo vacío", Buffer.alloc(0), /vacío/],
    ["más de 4 MB", Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(4 * 1024 * 1024)]), /4 MB/],
  ])("rechaza %s", async (_name, bytes, message) => {
    const { actor } = await admin();
    await expect(uploadImage(actor, bytes)).rejects.toThrow(message);
    expect(await testDb.media.count()).toBe(0);
  });

  it("rechaza imágenes demasiado chicas", async () => {
    const { actor } = await admin();
    await expect(uploadImage(actor, await photo(200, 150, "png"))).rejects.toThrow(/al menos 320/);
  });

  it("sólo sube quien tiene permiso", async () => {
    const { actor } = await admin();
    await testDb.user.update({ where: { id: actor.id }, data: { role: "CONTRIBUTOR" } });
    await expect(uploadImage({ ...actor, role: "CONTRIBUTOR" }, await photo())).rejects.toBeInstanceOf(
      MediaError,
    );
  });
});

describe("imagen principal de la nota", () => {
  it("se engancha al guardar, exige descripción para publicar y sale en el sitio", async () => {
    const { actor, category } = await admin();
    const image = await uploadImage(actor, await photo());
    const base = {
      title: "Nota con foto",
      excerpt: "Bajada.",
      content: doc,
      categoryId: category.id,
      tags: [],
    };

    const { id } = await createArticle(actor, { ...base, mainImageId: image.id });
    await expect(transitionArticle(actor, id, "publish")).rejects.toMatchObject({
      fieldErrors: { mainImageAlt: expect.stringMatching(/Describí la imagen/) },
    });

    await updateArticle(actor, id, {
      ...base,
      mainImageId: image.id,
      mainImageAlt: "Una represa al atardecer",
      mainImageCredit: "Foto: Agencia",
    });
    await transitionArticle(actor, id, "publish");

    const home = await getHomepage();
    expect(home.lead?.image).toMatchObject({ alt: "Una represa al atardecer", credit: "Foto: Agencia" });
    const found = await findPublishedArticle("nota-con-foto");
    expect(found.kind === "article" && found.article.image?.ogUrl).toMatch(/og\.jpg$/);
    expect((await getArticleForEdit(id))?.mainImage?.id).toBe(image.id);

    // Quitarla en el editor la saca de la nota, pero la imagen queda guardada.
    await updateArticle(actor, id, { ...base });
    expect((await getHomepage()).lead?.image).toBeNull();
    expect(await testDb.media.count()).toBe(1);
  });

  it("una imagen que no existe se avisa en el campo", async () => {
    const { actor, category } = await admin();
    await expect(
      createArticle(actor, { title: "X", content: doc, categoryId: category.id, mainImageId: "no-existe" }),
    ).rejects.toMatchObject({ fieldErrors: { mainImage: expect.any(String) } });
  });
});
