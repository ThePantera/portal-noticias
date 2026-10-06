import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

/**
 * Tests end to end contra el build de producción. Usan E2E_DATABASE_URL (una base
 * aparte, igual que los de integración) y crean el administrador con npm run admin:create.
 */
const PORT = Number(process.env.E2E_PORT ?? 3210);
const baseURL = `http://127.0.0.1:${PORT}`;

// Entornos con un Chromium ya instalado (contenedores) pueden indicar su ruta con
// PLAYWRIGHT_CHROMIUM_PATH. En local y en CI alcanza con `npx playwright install chromium`.
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
  : {};

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, launchOptions },
    },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions } },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? "",
      SITE_URL: baseURL,
      SITE_NAME: "Portal Noticias",
    },
  },
});
