import { expect, type Page } from "@playwright/test";
import { ADMIN } from "./e2e-database";

export async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/admin");
}

/** Acepta el confirm() del navegador que piden publicar, despublicar, archivar y eliminar. */
export function acceptDialogs(page: Page) {
  page.on("dialog", (dialog) => void dialog.accept());
}

export async function writeArticle(page: Page, title: string) {
  await page.goto("/admin/notas/nueva");
  await page.getByLabel("Título", { exact: true }).fill(title);
  await page.getByLabel("Bajada").fill("Una bajada que amplía el título.");
  const body = page.getByRole("textbox", { name: "Cuerpo de la nota" });
  await body.click();
  await body.pressSequentially("Primer párrafo de la nota.");
  await page.getByLabel("Categoría").selectOption({ label: "Economía" });
  await page.getByLabel("Etiquetas").fill("Inflación, Salarios");
}
