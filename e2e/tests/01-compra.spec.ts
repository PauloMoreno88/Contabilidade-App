import { expect, test } from "@playwright/test";
import { ADMIN_STATE, cpf } from "../lib/data";
import { alias, RUN_ID } from "../lib/env";
import { contractStatus, submitCheckout } from "../lib/mercado-pago";

// Fluxo 1: Da simulação ao primeiro acesso.
// Stops at the Mercado Pago link: Mercado Pago blocks automated browsers, so paying, activation and the
// welcome e-mail are checked by the assisted suite (`pnpm --filter e2e mercado-pago`).
const FLOW = "Fluxo 1: Da simulação ao primeiro acesso";
const name = `E2E Compra ${RUN_ID}`;
const email = alias("compra");

test.describe(FLOW, () => {
  test("simula, deixa o contato e abre o pagamento no Mercado Pago", async ({ page }) => {
    await page.goto("/");
    const sim = page.locator("#simulador");

    await expect(sim).toContainText("Passo 1 de 5");
    await sim.getByRole("button", { name: /Prestador de serviços/ }).click();
    await expect(sim).toContainText("Passo 2 de 5");
    await sim.getByRole("button", { name: "R$ 10.000" }).click();
    await sim.getByRole("button", { name: "Continuar" }).click();
    await sim.getByRole("button", { name: /Sim, já tenho/ }).click();
    await sim.getByRole("button", { name: /^Nenhum/ }).click();
    await expect(sim).toContainText("Passo 5 de 5");
    // "Voltar" keeps the answers.
    await sim.getByRole("button", { name: "Voltar" }).click();
    await expect(sim.getByRole("button", { name: /^Nenhum/ })).toHaveAttribute("aria-pressed", "true");
    await sim.getByRole("button", { name: "Continuar" }).click();
    await sim.getByRole("button", { name: /Simples Nacional/ }).click();
    await sim.getByRole("button", { name: "Continuar" }).click();

    // Gate (pre-launch mode, decision 44): contact first; errors without consent.
    await expect(sim).toContainText("Falta só o seu contato");
    await sim.getByRole("button", { name: "Quero falar com um contador" }).click();
    await expect(sim).toContainText("Informe seu nome.");
    await expect(sim).toContainText("Precisamos do seu consentimento para continuar.");
    await sim.getByLabel("Nome").fill(name);
    await sim.getByLabel("WhatsApp").fill("119");
    await sim.locator('input[name="consent"]').check();
    await sim.getByRole("button", { name: "Quero falar com um contador" }).click();
    await expect(sim).toContainText("Informe um WhatsApp com DDD.");
    await sim.getByLabel("WhatsApp").fill("(11) 98765-4321");
    await sim.getByLabel("E-mail (opcional)").fill(email);
    await sim.getByRole("button", { name: "Quero falar com um contador" }).click();

    // No tax values in pre-launch mode.
    await expect(sim).toContainText("Pronto, E2E!");
    await expect(sim).not.toContainText("Imposto estimado");
    await expect(sim).toContainText("Esta é uma estimativa");

    await sim.getByRole("link", { name: "Contratar o Plano Exactra" }).click();
    await expect(page).toHaveURL(/\/checkout\?/);

    // Checkout: validation first.
    await expect(page.getByText("contrato anual").first()).toBeVisible();
    await page.getByRole("button", { name: "Ir para o pagamento" }).click();
    await expect(page.getByText("Informe seu nome completo.")).toBeVisible();
    await expect(page.getByText("Precisamos do seu consentimento para continuar.")).toBeVisible();
    await page.locator("#co-name").fill(name);
    await page.locator("#co-email").fill(email);
    await page.locator("#co-phone").fill("11987654321");
    await page.locator("#co-document").fill("123");
    await page.locator('input[name="consent"]').check();
    await page.getByRole("button", { name: "Ir para o pagamento" }).click();
    await expect(page.getByText("Informe um CPF ou CNPJ válido.")).toBeVisible();

    await page.locator("#co-document").fill(cpf());

    // The contract waits for the payment; only the Mercado Pago webhook activates it.
    const checkout = await submitCheckout(page);
    expect(await contractStatus(checkout)).toBe("PENDING_PAYMENT");

    // Back from Mercado Pago without paying.
    await page.goto("/checkout?cancelado=1&plan=exactra");
    await expect(page.getByText("Pagamento não concluído")).toBeVisible();
  });

  test("checkout recusa CPF com dígitos verificadores errados", async ({ page }) => {
    await page.goto("/checkout?plan=exactra");
    await page.locator("#co-name").fill(name);
    await page.locator("#co-email").fill(email);
    await page.locator("#co-phone").fill("11987654321");
    await page.locator("#co-document").fill("111.111.111-11");
    await page.locator('input[name="consent"]').check();
    await page.getByRole("button", { name: "Ir para o pagamento" }).click();
    await expect(page.getByText("Informe um CPF ou CNPJ válido.")).toBeVisible({ timeout: 10_000 });
  });

  test("a equipe vê o lead e o contrato aguardando pagamento", async ({ browser }) => {
    const context = await browser.newContext({ storageState: ADMIN_STATE });
    const page = await context.newPage();

    await page.goto("/admin/leads");
    await page.getByPlaceholder("Buscar por nome, e-mail ou WhatsApp").fill(name);
    await expect(page.getByRole("row").filter({ hasText: name }).first()).toBeVisible();

    await page.goto("/admin");
    await page.getByPlaceholder("Buscar por nome, e-mail ou documento").fill(email);
    await expect(page.getByRole("row").filter({ hasText: name }).filter({ hasText: "Aguardando pagamento" }).first()).toBeVisible();
    await context.close();
  });
});
