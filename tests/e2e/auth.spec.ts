import { expect, test } from "@playwright/test";
import { ADMIN } from "./e2e-database";

async function login(page: import("@playwright/test").Page, password = ADMIN.password) {
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("sin sesión, /admin redirige al login y guarda el destino", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();

  await page.goto("/admin/notas");
  await expect(page).toHaveURL(/next=%2Fadmin%2Fnotas/);
});

test("con contraseña incorrecta muestra un error que no revela si el email existe", async ({ page }) => {
  await page.goto("/admin/login");
  await login(page, "incorrecta-pero-larga");
  await expect(page.getByTestId("login-error")).toHaveText("Email o contraseña incorrectos.");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("login, panel y cierre de sesión", async ({ page, context }) => {
  await page.goto("/admin/login");
  await login(page);
  await expect(page).toHaveURL("/admin");
  await expect(page.getByRole("heading", { name: `Hola, ${ADMIN.name}` })).toBeVisible();

  const cookie = (await context.cookies()).find((c) => c.name.includes("portal_session"));
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);

  // El token ya no sirve: volver atrás no devuelve el panel.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("una cookie de sesión robada o inventada no abre el panel", async ({ page, context }) => {
  await context.addCookies([
    { name: "portal_session", value: "token-inventado", url: "http://127.0.0.1:3210" },
  ]);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("el login no se indexa y la página pública no pide sesión", async ({ page }) => {
  const response = await page.goto("/admin/login");
  expect(response?.headers()["x-robots-tag"] ?? "").toContain("noindex");
  await expect(page.getByRole("link", { name: /Portal/ })).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("la página de login no desborda a lo ancho", async ({ page }) => {
  await page.goto("/admin/login");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
});
