import { expect, test } from "@playwright/test";
import { E2E_ASSISTANT_KEY } from "./e2e-database";
import { login } from "./helpers";

const auth = { authorization: `Bearer ${E2E_ASSISTANT_KEY}` };

test("la API del asistente rechaza pedidos sin la llave", async ({ request }) => {
  expect((await request.get("/api/assistant/articles")).status()).toBe(401);
  const wrong = await request.post("/api/assistant/articles", {
    headers: { authorization: "Bearer otra-llave" },
    data: {},
  });
  expect(wrong.status()).toBe(401);
});

test("el asistente publica, corrige y elimina una nota", async ({ request, page }) => {
  const list = await request.get("/api/assistant/articles", { headers: auth });
  expect(list.status()).toBe(200);
  const { categories } = (await list.json()) as { categories: { slug: string }[] };
  expect(categories.length).toBeGreaterThan(0);

  const created = await request.post("/api/assistant/articles", {
    headers: auth,
    data: {
      title: "Prueba del asistente en el portal",
      excerpt: "Una nota de prueba publicada por la API.",
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Cuerpo de la prueba." }] }],
      },
      category: categories[0].slug,
      sources: [{ name: "Fuente de prueba", url: "https://example.org/fuente" }],
      action: "publish",
    },
  });
  expect(created.status()).toBe(201);
  const { article } = (await created.json()) as { article: { id: string; slug: string; status: string } };
  expect(article.status).toBe("PUBLISHED");

  await page.goto(`/noticias/${article.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prueba del asistente en el portal");
  await expect(page.getByRole("link", { name: "Fuente de prueba" })).toHaveAttribute(
    "href",
    "https://example.org/fuente",
  );

  const fixed = await request.patch(`/api/assistant/articles/${article.id}`, {
    headers: auth,
    data: { title: "Prueba del asistente, corregida" },
  });
  expect(fixed.status()).toBe(200);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prueba del asistente, corregida");

  await login(page);
  await page.goto(`/admin/notas/${article.id}`);
  await expect(page.getByTestId("assistant-notice")).toBeVisible();
  await expect(page.getByTestId("assistant-notice")).toContainText("Nota del asistente de redacción");

  const removed = await request.delete(`/api/assistant/articles/${article.id}`, { headers: auth });
  expect(removed.status()).toBe(200);
  const gone = await page.goto(`/noticias/${article.slug}`);
  expect(gone?.status()).toBe(404);
});

test("la API explica los errores de validación", async ({ request }) => {
  const response = await request.post("/api/assistant/articles", {
    headers: auth,
    data: { title: "", category: "no-existe", sources: [] },
  });
  expect(response.status()).toBe(422);
  const body = (await response.json()) as { fieldErrors: Record<string, string> };
  expect(body.fieldErrors.sources).toBeTruthy();
});
