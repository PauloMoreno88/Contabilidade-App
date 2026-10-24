import { expect, test } from "@playwright/test";
import { ADMIN_STATE, cpf } from "../lib/data";
import { expectEmail } from "../lib/emails";
import { alias, RUN_ID, TEAM_INBOX } from "../lib/env";
import { payWithCard } from "../lib/pages";

// Fluxo 1: Da simulação ao primeiro acesso.
// Stops before "Cria a senha": the activation link only exists in the welcome e-mail.
const FLOW = "Fluxo 1: Da simulação ao primeiro acesso";
const name = `E2E Compra ${RUN_ID}`;
const email = alias("compra");

test.describe(FLOW, () => {
  test("simula, deixa o contato, contrata e paga com cartão", async ({ page }) => {
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
    await sim.getByRole("button", { name: "Ver meu resultado" }).click();

    // Gate: values hidden until the lead is sent; errors without consent.
    await expect(sim).toContainText("Sua estimativa está pronta");
    await sim.getByRole("button", { name: "Ver meu resultado" }).click();
    await expect(sim).toContainText("Informe seu nome.");
    await expect(sim).toContainText("Precisamos do seu consentimento para continuar.");
    await sim.getByLabel("Nome").fill(name);
    await sim.getByLabel("WhatsApp").fill("119");
    await sim.locator('input[name="consent"]').check();
    await sim.getByRole("button", { name: "Ver meu resultado" }).click();
    await expect(sim).toContainText("Informe um WhatsApp com DDD.");
    await sim.getByLabel("WhatsApp").fill("(11) 98765-4321");
    await sim.getByLabel("E-mail (opcional)").fill(email);
    await sim.getByRole("button", { name: "Ver meu resultado" }).click();

    await expect(sim).toContainText("E2E, este é o seu cenário");
    await expect(sim).toContainText("melhor opção");
    await expect(sim).toContainText("Quanto sobra por mês, já pagando a Exactra");
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
    await page.getByRole("button", { name: "Ir para o pagamento" }).click();

    // Stripe page: leave once ("Voltar"), nothing is charged.
    await page.waitForURL(/checkout\.stripe\.com/);
    await expect(page.getByText("R$ 3.588,00").first()).toBeVisible();
    await page.getByRole("link", { name: /Voltar/ }).first().click();
    await page.waitForURL(/\/checkout\?cancelado=1/);
    await expect(page.getByText("Pagamento não concluído")).toBeVisible();

    // Again: declined card first, then the approved one.
    await page.locator("#co-name").fill(name);
    await page.locator("#co-email").fill(email);
    await page.locator("#co-phone").fill("11987654321");
    await page.locator("#co-document").fill(cpf());
    await page.locator('input[name="consent"]').check();
    await page.getByRole("button", { name: "Ir para o pagamento" }).click();
    await payWithCard(page, "4000 0000 0000 0002", name);
    await expect(page.getByText(/recusado|declined/i).first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole("textbox", { name: "Número do cartão" }).fill("4242 4242 4242 4242");
    await page.getByRole("button", { name: "Pagar" }).click();

    // Back on the site: the status only changes when Stripe confirms (webhook).
    await page.waitForURL(/\/checkout\/status/, { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: "Pagamento confirmado" })).toBeVisible({ timeout: 90_000 });

    expectEmail(FLOW, email, "Boas-vindas à Exactra, E2E", "Com o botão para ativar o acesso (vale 7 dias).");
    expectEmail(FLOW, TEAM_INBOX, `Nova contratação: ${name} (Plano Exactra)`);
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

  test("a equipe vê o lead, o contrato ativo e o cliente sem senha criada", async ({ browser }) => {
    const context = await browser.newContext({ storageState: ADMIN_STATE });
    const page = await context.newPage();

    await page.goto("/admin/leads");
    await page.getByPlaceholder("Buscar por nome, e-mail ou WhatsApp").fill(name);
    await expect(page.getByRole("row").filter({ hasText: name }).first()).toBeVisible();

    await page.goto("/admin");
    await page.getByPlaceholder("Buscar por nome, e-mail ou documento").fill(email);
    const row = page.getByRole("row").filter({ hasText: name }).filter({ hasText: "Ativo" });
    await expect(row.first()).toBeVisible();
    await row.first().getByRole("link", { name }).click();
    await expect(page.getByText("Histórico de pagamentos")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Pago" }).first()).toBeVisible();

    await page.goto("/admin/clientes");
    await page.getByPlaceholder("Buscar por nome, e-mail ou CPF/CNPJ").fill(email);
    await expect(page.getByRole("row").filter({ hasText: name }).filter({ hasText: "Convite enviado" })).toBeVisible();
    await context.close();
  });
});
