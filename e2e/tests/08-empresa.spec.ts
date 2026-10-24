import { expect, test } from "@playwright/test";
import { ADMIN_STATE, CUSTOMER_STATE } from "../lib/data";
import { RUN_ID } from "../lib/env";
import { customerCompanyId, openCustomerById } from "../lib/pages";

// Fluxo 8: Dados da empresa pelo cliente. Every change is undone at the end.
test.describe("Fluxo 8: Dados da empresa pelo cliente", () => {
  test.use({ storageState: CUSTOMER_STATE });

  test("dados travados, telefone, perfil e quem acessa", async ({ page, browser }) => {
    await page.goto("/app/empresa");
    await expect(page.getByRole("heading", { name: "Empresa e acesso" })).toBeVisible();
    await expect(page.getByText("Nome, CPF/CNPJ e e-mail só mudam pela equipe da Exactra.")).toBeVisible();
    await expect(page.getByText(/\(você\)|você/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Falar|WhatsApp|Exactra/ }).or(page.locator('a[href*="wa.me"]')).first()).toBeAttached();

    // Phone: change, check on the team side, change back.
    const phone = page.locator("#phone");
    const original = await phone.inputValue();
    const temp = original.replace(/\D/g, "").endsWith("977776666") ? "(21) 96666-5555" : "(21) 97777-6666";
    const dataForm = page.locator("form").filter({ has: phone });
    await phone.fill(temp);
    await dataForm.getByRole("button", { name: "Salvar" }).click();
    await expect(dataForm.getByRole("status")).toHaveText("Salvo");

    const admin = await (await browser.newContext({ storageState: ADMIN_STATE })).newPage();
    await openCustomerById(admin, await customerCompanyId(), "Acesso e dados");
    await expect(admin.getByText(new RegExp(temp.slice(-9).replace("-", "-?")))).toBeVisible();

    // Typing the original back right after a save can be saved too.
    await phone.fill(original);
    await dataForm.getByRole("button", { name: "Salvar" }).click();
    await expect(dataForm.getByRole("status")).toHaveText("Salvo");

    // Profile: add a bank, save, then remove it and save again.
    const bank = `Banco E2E ${RUN_ID}`;
    const profileForm = page.locator("form").filter({ has: page.locator("#bank") });
    await page.locator("#bank").fill(bank);
    await profileForm.getByRole("button", { name: "Adicionar" }).click();
    await expect(profileForm.getByText(bank)).toBeVisible();
    await profileForm.getByRole("button", { name: "Salvar" }).click();
    await expect(profileForm.getByRole("status")).toHaveText("Salvo");

    await profileForm.getByRole("button", { name: `Remover ${bank}` }).click();
    await profileForm.getByRole("button", { name: "Salvar" }).click();
    await expect(profileForm.getByRole("status")).toHaveText("Salvo");
    await expect(profileForm.getByText(bank)).toHaveCount(0);
  });
});
