import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright — portail captif Spark.
 *
 * - Projet "local" : baseURL http://localhost:4173 (vite preview du build) — DÉTERMINISTE,
 *   utilisé par la CI. Ne touche jamais Vercel/production.
 * - Projet "vercel" : staging/production, uniquement en exécution MANUELLE
 *   (`E2E_TARGET=vercel npx playwright test --project=vercel`) — jamais en CI :
 *   le parcours démo écrit dans la base de démo, on n'écrit pas en live depuis la CI.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "local",
      use: { ...devices["Pixel 7"], baseURL: "http://localhost:4173" },
    },
    {
      name: "vercel",
      testIgnore: process.env.E2E_TARGET === "vercel" ? [] : [".*"],
      use: {
        ...devices["Pixel 7"],
        baseURL: "https://captive-spark-portal-plus.vercel.app",
      },
    },
  ],
  // La CI et le run local démarrent le build via `npm run preview` (déjà dans package.json).
  webServer: process.env.E2E_TARGET === "vercel"
    ? undefined
    : {
        command: "npm run preview -- --port 4173 --strictPort",
        url: "http://localhost:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
