import { test, expect } from "@playwright/test";

/**
 * Parcours complet du portail démo — déterministe :
 * accueil → slides visibles → OTP démo 123456 → quiz → accès accordé → logos paiement.
 *
 * Cible : LOCAL uniquement (webServer vite preview, projet "local" de playwright.config.ts).
 * Jamais contre Vercel/production depuis la CI (aucune écriture live).
 * Le code OTP 123456 est le mode dévo béta volontairement maintenu jusqu'à la mise en prod
 * (skill captive-portal-dev : ne pas retirer silencieusement).
 */

test.describe("Portail démo — parcours complet", () => {
  test("accueil → OTP 123456 → quiz → accès → paiement", async ({ page }) => {
    await page.goto("/portal/demo", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // 1. Slides pub visibles (démo : slides par défaut si aucune config publiée)
    await expect(page.getByText("Accès WiFi Haut Débit").first()).toBeVisible({
      timeout: 15000,
    });

    // 2. Authentification SMS (OTP démo)
    await page.locator('input[placeholder*="77" i]').first().fill("771234567");
    await page.getByRole("button").filter({ hasText: /envoyer/i }).first().click();
    await page.waitForTimeout(1500);

    const slot = page
      .locator('input[inputmode="numeric"], input[maxlength="1"]')
      .first();
    await slot.click();
    await page.keyboard.type("123456", { delay: 80 });
    await page.getByRole("button").filter({ hasText: /vérifi/i }).first().click();

    // 3. Quiz d'engagement (déterministe : engagement_type=quiz en démo)
    await page.waitForTimeout(3000);
    for (let i = 0; i < 3; i++) {
      const radio = page.getByRole("radio").nth(0);
      if ((await radio.count()) > 0) {
        await radio.first().click();
        await page.waitForTimeout(300);
        const next = page.getByRole("button").filter({ hasText: /suivant|next/i }).first();
        if ((await next.count()) > 0) await next.click();
      }
      await page.waitForTimeout(1200);
    }

    // 4. Accès accordé
    await expect(
      page.getByText(/access granted|accès accord/i).first()
    ).toBeVisible({ timeout: 20000 });

    // 5. Section paiement : logos visibles (Wave / Orange Money / Free Money)
    const payment = page.getByRole("button").filter({ hasText: /buy|acheter|time/i }).first();
    if ((await payment.count()) > 0) {
      await payment.click();
      await page.waitForTimeout(2000);
      await expect(page.getByAltText("Wave")).toBeVisible();
      await expect(page.getByAltText("Orange Money")).toBeVisible();
      // Aucun paiement réel : le bandeau démo doit être affiché
      await expect(page.getByText(/aucun paiement réel/i).first()).toBeVisible();
    }
  });
});
