import { expect, test, type Page } from "@playwright/test";
import { ADMIN, E2E_CRON_SECRET } from "./global-setup";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/admin");
}

/** Acepta el confirm() del navegador que piden publicar, despublicar, archivar y eliminar. */
function acceptDialogs(page: Page) {
  page.on("dialog", (dialog) => void dialog.accept());
}

async function writeArticle(page: Page, title: string) {
  await page.goto("/admin/notas/nueva");
  await page.getByLabel("Título", { exact: true }).fill(title);
  await page.getByLabel("Bajada").fill("Una bajada que amplía el título.");
  const body = page.getByRole("textbox", { name: "Cuerpo de la nota" });
  await body.click();
  await body.pressSequentially("Primer párrafo de la nota.");
  await page.getByLabel("Categoría").selectOption({ label: "Economía" });
  await page.getByLabel("Etiquetas").fill("Inflación, Salarios");
}

test("escribir, publicar, editar, despublicar, archivar y eliminar una nota", async ({ page }, info) => {
  acceptDialogs(page);
  await login(page);
  const title = `Nota de prueba ${info.project.name} ${Date.now()}`;

  await writeArticle(page, title);
  await page.getByRole("button", { name: "Publicar ahora" }).click();
  await expect(page).toHaveURL(/\/admin\/notas\/[a-z0-9]+\?guardada=publish/);
  await expect(page.getByTestId("editor-message").filter({ visible: true })).toHaveText(
    "Nota creada y publicada.",
  );
  await expect(page.getByTestId("editor-status").filter({ visible: true })).toHaveText("Publicada");

  // El editor recupera lo guardado, incluido el cuerpo del documento.
  await page.reload();
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue(title);
  await expect(page.getByRole("textbox", { name: "Cuerpo de la nota" })).toContainText(
    "Primer párrafo de la nota.",
  );
  await expect(page.getByLabel("Etiquetas")).toHaveValue("Inflación, Salarios");

  // Formato y enlace desde la barra de herramientas.
  const body = page.getByRole("textbox", { name: "Cuerpo de la nota" });
  await body.click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await body.pressSequentially("Fuente oficial");
  await page.keyboard.press("Shift+Home");
  await page.getByRole("button", { name: "Enlace" }).click();
  await page.getByLabel("Dirección del enlace").fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "https://" })).toBeVisible();
  await page.getByLabel("Dirección del enlace").fill("www.indec.gob.ar");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByTestId("editor-message").filter({ visible: true })).toHaveText("Cambios guardados.");

  // La vista previa muestra el enlace seguro, con https agregado.
  await page.goto(page.url().split("?")[0] + "/vista-previa");
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole("link", { name: "Fuente oficial" })).toHaveAttribute(
    "href",
    "https://www.indec.gob.ar/",
  );
  await page.getByRole("link", { name: "Volver al editor" }).click();

  // Una nota publicada no se puede eliminar: primero se despublica.
  await expect(page.getByRole("button", { name: "Eliminar nota" })).toHaveCount(0);
  await page.getByRole("button", { name: "Despublicar" }).click();
  await expect(page.getByTestId("editor-message").filter({ visible: true })).toHaveText(
    "La nota volvió a borrador.",
  );
  await page.getByRole("button", { name: "Archivar" }).click();
  await expect(page.getByTestId("editor-message").filter({ visible: true })).toHaveText("Nota archivada.");

  // Aparece en el listado filtrado por estado.
  await page.goto("/admin/notas?estado=archived");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  await page.getByRole("link", { name: title }).click();

  await page.getByRole("button", { name: "Eliminar nota" }).click();
  await expect(page).toHaveURL(/\/admin\/notas\?eliminada=1/);
  await expect(page.getByText("La nota se eliminó.")).toBeVisible();
  await expect(page.getByRole("link", { name: title })).toHaveCount(0);
});

test('después de crear una nota, "Escribir una nota" abre un formulario en blanco', async ({
  page,
}, info) => {
  await login(page);
  await writeArticle(page, `Primera ${info.project.name} ${Date.now()}`);
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByTestId("editor-message").filter({ visible: true })).toHaveText(
    "Nota creada como borrador.",
  );

  await page.getByRole("link", { name: "Notas", exact: true }).first().click();
  await page.getByRole("link", { name: "Escribir una nota" }).click();
  await expect(page).toHaveURL("/admin/notas/nueva");
  await expect(page.getByLabel("Título", { exact: true }).filter({ visible: true })).toHaveValue("");
  await expect(page.getByLabel("Bajada").filter({ visible: true })).toHaveValue("");
});

test("programar exige fecha futura y la hora se toma de Buenos Aires", async ({ page }, info) => {
  acceptDialogs(page);
  await login(page);
  await writeArticle(page, `Programada ${info.project.name} ${Date.now()}`);
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByTestId("editor-message").filter({ visible: true })).toHaveText(
    "Nota creada como borrador.",
  );

  await page.getByRole("button", { name: "Programar…" }).click();
  await page.getByLabel("Fecha y hora de publicación").fill("2020-01-01T10:00");
  await page.getByRole("button", { name: "Programar", exact: true }).click();
  await expect(page.getByText("Elegí una fecha y hora futuras.")).toBeVisible();

  await page.getByLabel("Fecha y hora de publicación").fill("2030-05-20T09:30");
  await page.getByRole("button", { name: "Programar", exact: true }).click();
  await expect(page.getByTestId("editor-message").filter({ visible: true })).toHaveText("Nota programada.");
  await expect(page.getByText("20/05/2030, 09:30")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancelar programación" })).toBeVisible();
});

test("sin bajada no se publica, y lo escrito no se pierde", async ({ page }, info) => {
  acceptDialogs(page);
  await login(page);
  const title = `Incompleta ${info.project.name} ${Date.now()}`;
  await page.goto("/admin/notas/nueva");
  await page.getByLabel("Título", { exact: true }).fill(title);
  await page.getByLabel("Categoría").selectOption({ label: "Política" });
  await page.getByRole("button", { name: "Publicar ahora" }).click();

  await expect(page.getByTestId("editor-message").filter({ visible: true })).toHaveText(
    "La nota se guardó como borrador. Para publicarla falta la bajada y el cuerpo.",
  );
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue(title);
  await expect(page.getByTestId("editor-status").filter({ visible: true })).toHaveText("Borrador");
});

test("el editor y el listado no desbordan a lo ancho", async ({ page }) => {
  await login(page);
  for (const path of ["/admin/notas", "/admin/notas/nueva"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll, path).toBeLessThanOrEqual(client);
  }
});

test("el publicador sólo responde con el secreto", async ({ request }) => {
  const rejected: Record<string, string>[] = [
    {},
    { authorization: "Bearer cualquier-cosa" },
    { authorization: E2E_CRON_SECRET },
  ];
  for (const headers of rejected) {
    const response = await request.post("/api/cron/publish-scheduled", { headers });
    expect(response.status()).toBe(401);
  }
  const ok = await request.post("/api/cron/publish-scheduled", {
    headers: { authorization: `Bearer ${E2E_CRON_SECRET}` },
  });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toHaveProperty("published");
});
