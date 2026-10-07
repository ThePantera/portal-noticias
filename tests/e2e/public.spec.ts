import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { acceptDialogs, login, writeArticle } from "./helpers";

/** Todas las etiquetas robots de la página (Next agrega la suya en los 404) piden no indexar. */
async function expectNoindex(page: Page) {
  const robots = await page
    .locator('meta[name="robots"]')
    .evaluateAll((tags) => tags.map((tag) => tag.getAttribute("content") ?? ""));
  expect(robots.length).toBeGreaterThan(0);
  for (const content of robots) expect(content).toContain("noindex");
}

/** Palabra inventada y única por corrida, para encontrar la nota en la búsqueda. */
function uniqueWord() {
  return Date.now()
    .toString()
    .split("")
    .map((d) => "bcdfghjklm"[Number(d)])
    .join("");
}

test("lo que se publica aparece en el sitio y lo que se despublica desaparece", async ({ page }, info) => {
  acceptDialogs(page);
  await login(page);
  const word = uniqueWord();
  const title = `Represa ${word} ${info.project.name}`;
  await writeArticle(page, title);
  await page.getByRole("button", { name: "Publicar ahora" }).click();
  await expect(page.getByTestId("editor-status").filter({ visible: true })).toHaveText("Publicada");
  const editorUrl = page.url().split("?")[0];

  // Portada: la nota recién publicada está, sin esperar a que venza la caché.
  await page.goto("/");
  await page.getByRole("link", { name: title }).first().click();
  await expect(page).toHaveURL(/\/noticias\/represa-/);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText("Primer párrafo de la nota.")).toBeVisible();
  const articleUrl = page.url();
  expect(await page.getByRole("link", { name: /WhatsApp/ }).getAttribute("href")).toContain(
    encodeURIComponent(articleUrl),
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", articleUrl);
  const ld = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) => scripts.flatMap((s) => [JSON.parse(s.textContent ?? "null")].flat()));
  expect(ld.find((item: { "@type": string }) => item["@type"] === "NewsArticle")).toMatchObject({
    headline: title,
    url: articleUrl,
  });
  expect(await (await page.request.get("/sitemap.xml")).text()).toContain(
    `${new URL(articleUrl).pathname}</loc>`,
  );
  expect(await (await page.request.get("/feed.xml")).text()).toContain(title);

  // Sección y etiqueta enlazadas desde la nota.
  await page.getByRole("navigation", { name: "Ruta" }).getByRole("link", { name: "Economía" }).click();
  await expect(page).toHaveURL("/categoria/economia");
  await expect(page.getByRole("heading", { level: 1, name: "Economía" })).toBeVisible();
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  await page.goBack();
  await page.getByRole("link", { name: "Salarios", exact: true }).click();
  await expect(page).toHaveURL("/tag/salarios");
  await expect(page.getByRole("link", { name: title })).toBeVisible();

  // Búsqueda sin tildes ni mayúsculas.
  await page.goto(`/buscar?q=${word.toUpperCase()}`);
  await expect(page.getByRole("status").filter({ hasText: "resultado" })).toHaveText(/^1 resultado/);
  await expect(page.getByRole("link", { name: title })).toBeVisible();

  // Despublicar la saca del sitio en el acto.
  await page.goto(editorUrl);
  await page.getByRole("button", { name: "Despublicar" }).click();
  await expect(page.getByTestId("editor-status").filter({ visible: true })).toHaveText("Borrador");
  await page.goto(articleUrl);
  await expect(page.getByText("No encontramos esta página")).toBeVisible();
  await expectNoindex(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: title })).toHaveCount(0);
  await page.goto(`/buscar?q=${word}`);
  await expect(page.getByText(/No encontramos notas/)).toBeVisible();
});

test("la foto principal se sube en el editor y sale en la portada, la nota y las redes", async ({
  page,
}, info) => {
  acceptDialogs(page);
  await login(page);
  const title = `Represa con foto ${uniqueWord()} ${info.project.name}`;
  await writeArticle(page, title);

  // Un archivo que no es imagen se rechaza sin romper el formulario.
  const file = page.getByLabel(/Elegí una imagen/);
  await file.setInputFiles({
    name: "falsa.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("no soy una foto"),
  });
  await expect(page.getByRole("alert").filter({ hasText: "JPG, PNG, WebP o AVIF" })).toBeVisible();

  // Una foto de celular pesada (más de 4 MB): el navegador la achica antes de subirla.
  const photo = await sharp({
    create: {
      width: 3000,
      height: 2000,
      channels: 3,
      background: "#3a6f8f",
      noise: { type: "gaussian", mean: 120, sigma: 40 },
    },
  })
    .png()
    .toBuffer();
  expect(photo.length).toBeGreaterThan(4 * 1024 * 1024);
  await file.setInputFiles({ name: "represa.png", mimeType: "image/png", buffer: photo });
  await expect(page.getByTestId("main-image-preview")).toBeVisible();

  // Publicar sin describir la foto no se permite.
  await page.getByRole("button", { name: "Publicar ahora" }).click();
  await expect(page.getByTestId("editor-message")).toContainText("falta la descripción de la imagen");
  await page.getByLabel("Descripción de la imagen").fill("La represa vista desde el aire");
  await page.getByLabel("Epígrafe").fill("El embalse, en su nivel más bajo.");
  await page.getByLabel("Crédito").fill("Foto: Agencia");
  await page.getByRole("button", { name: "Publicar ahora" }).click();
  await expect(page.getByTestId("editor-status").filter({ visible: true })).toHaveText("Publicada");

  await page.goto("/");
  const card = page.getByRole("article").filter({ hasText: title }).first();
  await expect(card.getByRole("img", { includeHidden: true })).toHaveAttribute("srcset", /w480\.webp 480w/);

  await page.getByRole("link", { name: title }).first().click();
  const figure = page.locator("figure").first();
  await expect(figure.getByRole("img", { name: "La represa vista desde el aire" })).toBeVisible();
  await expect(figure).toContainText("El embalse, en su nivel más bajo. Foto: Agencia");
  const loaded = await figure.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth);
  expect(loaded).toBeGreaterThan(0);

  const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(ogImage).toMatch(/^http.*\/og\.jpg$/);
  const og = await page.request.get(ogImage!);
  expect(og.headers()["content-type"]).toBe("image/jpeg");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
});

test("las direcciones inexistentes responden 404 de verdad y no se indexan", async ({ page }) => {
  for (const path of ["/noticias/esta-nota-no-existe", "/categoria/no-existe", "/tag/no-existe"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByText("No encontramos esta página")).toBeVisible();
    await expectNoindex(page);
  }
});

test("buscadores: robots, sitemaps, RSS y datos estructurados", async ({ page, request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toContain("/sitemap.xml");

  for (const [path, type] of [
    ["/sitemap.xml", "xml"],
    ["/news-sitemap.xml", "xml"],
    ["/feed.xml", "rss+xml"],
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).toContain(type);
  }
  expect(await (await request.get("/sitemap.xml")).text()).toContain("/categoria/economia</loc>");

  await page.goto("/");
  const types = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) => scripts.flatMap((s) => [JSON.parse(s.textContent ?? "null")].flat()));
  expect(types.map((t: { "@type": string }) => t["@type"])).toEqual(["WebSite", "NewsMediaOrganization"]);
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveCount(1);
});

test("las páginas públicas no desbordan a lo ancho", async ({ page }) => {
  for (const path of ["/", "/categoria/economia", "/buscar?q=economia", "/noticias/esta-nota-no-existe"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { scroll, client, culprits } = await page.evaluate(() => {
      const client = document.documentElement.clientWidth;
      // Si desborda, el mensaje dice qué elementos se pasan del borde derecho.
      const culprits = [...document.querySelectorAll("body *")]
        .filter((el) => el.getBoundingClientRect().right > client + 1)
        .filter((el) => {
          // Lo que queda adentro de algo con scroll o recorte propio no desborda la página.
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement)
            if (getComputedStyle(p).overflowX !== "visible") return false;
          return true;
        })
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`);
      return { scroll: document.documentElement.scrollWidth, client, culprits };
    });
    expect(scroll, `${path}: ${culprits.join(" | ")}`).toBeLessThanOrEqual(client);
  }
});
