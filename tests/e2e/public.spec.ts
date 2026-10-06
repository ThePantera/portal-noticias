import { expect, test, type Page } from "@playwright/test";
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

test("una dirección inexistente muestra el 404 y no se indexa", async ({ page }) => {
  await page.goto("/noticias/esta-nota-no-existe");
  await expect(page.getByText("No encontramos esta página")).toBeVisible();
  await expectNoindex(page);
  await page.goto("/categoria/no-existe");
  await expect(page.getByText("No encontramos esta página")).toBeVisible();
});

test("las páginas públicas no desbordan a lo ancho", async ({ page }) => {
  for (const path of ["/", "/categoria/economia", "/buscar?q=economia", "/noticias/esta-nota-no-existe"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll, path).toBeLessThanOrEqual(client);
  }
});
