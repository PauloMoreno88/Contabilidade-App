import { expect, test } from "@playwright/test";
import { ADMIN_STATE, cpf } from "../lib/data";
import { expectEmail } from "../lib/emails";
import { alias, RUN_ID } from "../lib/env";

// Fluxo 2: Cliente que já é da Exactra. Stops before "Cria a senha" (link only in the e-mail).
const FLOW = "Fluxo 2: Cliente que já é da Exactra";
const name = `E2E Manual ${RUN_ID}`;
const email = alias("manual");

test.use({ storageState: ADMIN_STATE });

test(`${FLOW}: cadastro, convite e reenvio`, async ({ page }) => {
  await page.goto("/admin/clientes");
  await page.getByRole("link", { name: "Cadastrar cliente" }).click();
  await expect(page).toHaveURL(/\/admin\/clientes\/novo/);

  // Contract ends in 30 days: after activation this customer can test the renewal (Fluxo 4).
  const end = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  await page.locator("#name").fill(name);
  await page.locator("#document").fill(cpf());
  await page.locator("#phone").fill("21987654321");
  await page.locator("#email").fill(email);
  await page.locator("#endsAt").fill(end);
  await page.locator("#amount").fill("3.588,00");
  await expect(page.locator('input[name="sendInvite"]')).toBeChecked();
  await page.getByRole("button", { name: "Cadastrar" }).click();

  await page.waitForURL(/\/admin\/cliente\?id=.+aba=access/);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText("Ainda não criou a senha")).toBeVisible();
  await expect(page.getByText(/Convite válido até/)).toBeVisible();
  await expect(page.getByText("Manual").first()).toBeVisible();
  expectEmail(FLOW, email, "Ative seu acesso à área do cliente da Exactra", "Convite do cadastro manual.");

  await page.getByRole("button", { name: "Reenviar convite" }).click();
  await expect(page.getByRole("status")).toContainText(`Convite enviado para ${email}.`);
  expectEmail(FLOW, email, "Ative seu acesso à área do cliente da Exactra", "Reenvio do convite.");

  await page.goto("/admin/clientes");
  await page.getByPlaceholder("Buscar por nome, e-mail ou CPF/CNPJ").fill(email);
  await expect(page.getByRole("row").filter({ hasText: name }).filter({ hasText: "Convite enviado" })).toBeVisible();

  await page.goto("/admin/mes");
  await page.getByRole("button", { name: "Sem acesso ativado" }).click();
  await page.getByPlaceholder("Buscar cliente por nome ou CPF/CNPJ").fill(name);
  await expect(page.getByRole("row").filter({ hasText: name })).toBeVisible();
});
