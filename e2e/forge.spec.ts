/**
 * FORGE — tests e2e (LOCAL uniquement, comme portal-demo.spec.ts).
 *
 * Les pages /admin/* sont protégées par auth Supabase + SiteContext. Un test
 * e2e sans credentials ne peut pas forger un état valide de façon
 * déterministe (pas d'écriture réseau). On valide donc ici CE QUI EST
 * testable sans credentials :
 *  - la route /admin/forge est protégée (redirige vers /admin/login)
 *  - la route /admin/kits est protégée
 *  - le portail preview répond sur ?preview=1
 *
 * La logique de réordonnancement du parcours (le cœur de la Forge) est
 * couverte par des tests unitaires : modules.test.ts (moveFlowStep /
 * toggleFlowStep) — déterministes, sans réseau.
 */
import { test, expect } from "@playwright/test";

test.describe("Forge — routes protégées", () => {
  test("redirige /admin/forge vers la connexion sans session", async ({
    page,
  }) => {
    await page.goto("/admin/forge");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("redirige /admin/kits vers la connexion sans session", async ({
    page,
  }) => {
    await page.goto("/admin/kits");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe("Forge — aperçu du portail", () => {
  test("le portail preview est reachable via ?preview=1", async ({ page }) => {
    await page.goto("/portal/demo?preview=1");
    // Le portail démo se rend (déterministe — pas de config Supabase requise)
    await expect(page.locator("body")).toBeVisible();
  });
});
