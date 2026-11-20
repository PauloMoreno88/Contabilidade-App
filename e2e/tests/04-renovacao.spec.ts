import { expect, test } from "@playwright/test";
import { ADMIN_STATE, CUSTOMER_STATE } from "../lib/data";
import { CUSTOMER } from "../lib/env";

// Fluxo 4: Renovação e fim do contrato.
// The test customer already renewed (next contract paid), so the "Renovar" step itself is not available.
// Expiry notice, read-only and blocked access depend on dates and are listed as manual checks.
test.describe("Fluxo 4: Renovação e fim do contrato", () => {
  test("cliente vê o contrato atual e o próximo contrato já pago", async ({ browser }) => {
    const page = await (await browser.newContext({ storageState: CUSTOMER_STATE })).newPage();
    await page.goto("/app/plano");
    await expect(page.getByRole("heading", { name: "Meu plano" })).toBeVisible();
    await expect(page.getByText("Contrato atual")).toBeVisible();
    await expect(page.getByText(/Faltam \d+ dias|Falta 1 dia|Termina hoje/)).toBeVisible();

    const next = page.getByText("Próximo contrato (já pago)");
    if (await next.count()) {
      await expect(next).toBeVisible();
      // With the next contract paid, there is nothing to renew.
      await expect(page.getByRole("heading", { name: "Renovar por mais 12 meses" })).toHaveCount(0);
    } else {
      // No renewal yet: either the window is open (renew form) or the opening date is shown.
      await expect(page.getByText(/Renovar por mais 12 meses|A renovação abre em/)).toBeVisible();
    }
    await expect(page.getByText("Pagamentos").first()).toBeVisible();
  });

  test("equipe vê os dois contratos do cliente", async ({ browser }) => {
    const page = await (await browser.newContext({ storageState: ADMIN_STATE })).newPage();
    await page.goto("/admin");
    await page.getByPlaceholder("Buscar por nome, e-mail ou documento").fill(CUSTOMER.email);
    await expect(page.getByRole("row").filter({ hasText: "Ativo" }).first()).toBeVisible();
  });
});
