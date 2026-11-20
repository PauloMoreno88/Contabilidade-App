import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { generate } from "otplib";
import { ADMIN_STATE, CUSTOMER_STATE } from "../lib/data";
import { ADMIN, RESULTS_DIR } from "../lib/env";
import { customerCompanyId, openCustomerById } from "../lib/pages";

// Fluxo 7: Gestão pelo painel da equipe.
test.describe("Fluxo 7: Gestão pelo painel da equipe", () => {
  test.use({ storageState: ADMIN_STATE });

  test("ativa e desativa a verificação em duas etapas", async ({ page }) => {
    await page.goto("/admin/seguranca");
    await expect(page.getByText("Desativada nesta conta.")).toBeVisible();
    await page.getByLabel("Sua senha").fill(ADMIN.password);
    await page.getByRole("button", { name: "Ativar verificação" }).click();

    const secret = (await page.locator("code").first().textContent())?.trim() ?? "";
    expect(secret).toMatch(/^[A-Z2-7]{16,}$/);
    // Kept on disk in case the run stops halfway: add it to an authenticator app to sign in.
    fs.writeFileSync(path.join(RESULTS_DIR, "admin-2fa-secret.txt"), `${secret}\n`);
    await expect(page.getByRole("button", { name: "Copiar códigos" })).toBeVisible();

    await page.getByLabel("Código de 6 dígitos").fill(await generate({ secret }));
    await page.getByRole("button", { name: "Confirmar e ativar" }).click();
    await expect(page.getByText("Pronto. A partir do próximo login, vamos pedir o código do app.")).toBeVisible();

    // Back to how it was: the shared admin account stays without 2FA.
    await page.reload();
    await page.locator("#disable-password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Desativar" }).click();
    await expect(page.getByText("Desativada nesta conta.")).toBeVisible();
    fs.rmSync(path.join(RESULTS_DIR, "admin-2fa-secret.txt"));
  });

  test("números, filtros, detalhe do contrato e CSV", async ({ page }) => {
    await page.goto("/admin");
    for (const card of ["Clientes ativos", "Novos nos últimos 30 dias", "Receita contratada", "Aguardando pagamento", "Vencem em 30 dias"]) {
      await expect(page.getByText(card).first()).toBeVisible();
    }

    await page.getByLabel("Todos os status").selectOption({ label: "Ativo" });
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    // Wait for the filtered list: every row "Ativo".
    await expect.poll(async () => (await rows.allInnerTexts()).every((t) => t.includes("Ativo"))).toBe(true);

    await page.getByPlaceholder("Buscar por nome, e-mail ou documento").fill("zzzz-nenhum-cliente");
    await expect(page.getByText("Nenhum contrato encontrado com esses filtros.")).toBeVisible();
    await page.getByPlaceholder("Buscar por nome, e-mail ou documento").fill("");

    await rows.first().getByRole("link").click();
    await expect(page).toHaveURL(/\/admin\/contrato\?id=/);
    await expect(page.getByText("Histórico de pagamentos")).toBeVisible();

    await page.goto("/admin");
    await page.getByLabel("Todos os status").selectOption({ label: "Ativo" });
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV" }).click();
    const csv = await download;
    expect(csv.suggestedFilename()).toBe("contratos-exactra.csv");
    const content = fs.readFileSync(await csv.path(), "utf8");
    expect(content.split("\n").length).toBeGreaterThan(1);
  });

  test("leads do simulador", async ({ page }) => {
    await page.goto("/admin/leads");
    await page.getByPlaceholder("Buscar por nome, e-mail ou WhatsApp").fill("E2E");
    await expect(page.locator("tbody tr").first()).toContainText("E2E");
  });

  test("desliga e religa os lembretes do cliente", async ({ page, browser }) => {
    const id = await customerCompanyId();
    await openCustomerById(page, id, "Acesso e dados");
    const toggle = page.getByRole("button", { name: /^(Ligados|Desligados)$/ });
    const before = (await toggle.textContent())?.trim();
    if (before === "Ligados") {
      await toggle.click();
      await expect(page.getByRole("button", { name: "Desligados" })).toBeVisible();
    }

    const customer = await (await browser.newContext({ storageState: CUSTOMER_STATE })).newPage();
    await customer.goto("/app/empresa");
    await expect(customer.getByText("Lembretes por e-mail desligados pela equipe da Exactra.")).toBeVisible();

    await page.getByRole("button", { name: "Desligados" }).click();
    await expect(page.getByRole("button", { name: "Ligados" })).toBeVisible();
    await customer.reload();
    await expect(customer.getByText("Lembretes por e-mail ligados.")).toBeVisible();
  });
});
