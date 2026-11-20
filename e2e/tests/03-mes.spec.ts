import fs from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { ADMIN_STATE, CUSTOMER_STATE, file, runFile } from "../lib/data";
import { expectEmail } from "../lib/emails";
import { CUSTOMER, RESULTS_DIR, RUN_ID } from "../lib/env";
import { customerCompanyId, openCustomerById, removeTestItems } from "../lib/pages";

// Fluxo 3: Rotina do mês: documentos e guias, with the test customer and the team.
const FLOW = "Fluxo 3: Rotina do mês";
const itemTitle = `E2E documento ${RUN_ID}`;
const guideLabel = `DAS E2E ${RUN_ID}`;

test.describe.configure({ mode: "serial" });

async function as(browser: Browser, state: string): Promise<Page> {
  const context = await browser.newContext({ storageState: state, permissions: ["clipboard-read", "clipboard-write"] });
  return context.newPage();
}

const request = (page: Page, title: string) => page.locator("li").filter({ has: page.getByRole("heading", { name: title, exact: true }) });

test.describe(FLOW, () => {
  let customerName = "";
  let customerId = "";

  test.beforeAll(async () => {
    customerId = await customerCompanyId();
    await removeTestItems(customerId);
  });

  test("equipe cria um item só deste cliente valendo agora", async ({ browser }) => {
    const page = await as(browser, ADMIN_STATE);
    await openCustomerById(page, customerId, "Checklist");
    customerName = (await page.getByRole("heading", { level: 1 }).textContent())?.trim() ?? "";

    await page.getByPlaceholder("Nome do documento").fill(itemTitle);
    await page.getByLabel("Obrigatório").uncheck();
    const picker = page.getByLabel("Vale a partir de");
    await picker.selectOption({ index: 0 });
    await expect(picker.locator("option").first()).toHaveText(/^Agora/);
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(page.getByRole("listitem").filter({ hasText: itemTitle })).toContainText("Só deste cliente");
  });

  test("cliente envia os documentos do mês (computador, celular e outros)", async ({ browser }) => {
    const page = await as(browser, CUSTOMER_STATE);
    await page.goto("/app/documentos");
    await expect(request(page, itemTitle)).toBeVisible();

    // Wrong type is refused.
    const bad = path.join(RESULTS_DIR, "programa.exe");
    fs.writeFileSync(bad, "not a document");
    await page.getByLabel(itemTitle, { exact: true }).setInputFiles(bad);
    await expect(page.getByText(/tipo de arquivo não aceito/)).toBeVisible();

    // Every item that is still open gets a file; the "camera" input stands in for the phone photo.
    const pending = page.locator("li[id]").filter({ hasText: /Falta enviar|Envie de novo/ });
    for (let n = 0; (await pending.count()) > 0 && n < 20; n++) {
      const li = pending.first();
      const id = await li.getAttribute("id");
      // inputs: [0] "Enviar arquivo", [1] "Tirar foto" (phone camera)
      await li.locator('input[type="file"]').nth(n === 0 ? 1 : 0).setInputFiles(file("documento-extrato-bancario-teste.pdf"));
      await expect(page.locator(`li[id="${id}"]`)).toContainText("Enviado", { timeout: 30_000 });
    }
    await expect(request(page, itemTitle)).toContainText("Enviado");

    // "Outros documentos": send one and remove it again.
    page.on("dialog", (d) => d.accept());
    const others = page.locator("section").filter({ hasText: "Outros documentos" });
    const wrong = runFile("documento-notas-compra-teste.pdf");
    await page.getByLabel("Outros documentos", { exact: true }).setInputFiles(wrong.path);
    await expect(others.getByRole("button", { name: wrong.name, exact: true })).toBeVisible({ timeout: 30_000 });
    await others.getByRole("button", { name: `Remover ${wrong.name}` }).click();
    await expect(others.getByRole("button", { name: wrong.name, exact: true })).toHaveCount(0);
    const right = runFile("documento-ponto-funcionarios-teste.pdf");
    await page.getByLabel("Outros documentos", { exact: true }).setInputFiles(right.path);
    await expect(others.getByRole("button", { name: right.name, exact: true })).toBeVisible({ timeout: 30_000 });
  });

  test("equipe confere o mês e recusa um documento", async ({ browser }) => {
    const page = await as(browser, ADMIN_STATE);
    await page.goto("/admin/mes");
    await page.getByPlaceholder("Buscar cliente por nome ou CPF/CNPJ").fill(customerName);
    await expect(page.getByRole("row").filter({ hasText: customerName }).first()).toBeVisible();

    await openCustomerById(page, customerId, "Documentos");
    const item = page.getByRole("listitem").filter({ hasText: itemTitle });
    await expect(item).toContainText("Enviado");
    await item.getByRole("button", { name: "Recusar" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio").first().check();
    await dialog.getByLabel("Observação para o cliente (opcional)").fill("Teste automático: envie de novo, por favor.");
    await dialog.getByRole("button", { name: "Recusar e avisar o cliente" }).click();
    await expect(item).toContainText("Envie de novo");
    await expect(item).toContainText("Teste automático");
    expectEmail(FLOW, CUSTOMER.email, `Precisamos de um novo envio: ${itemTitle}`, "Com o motivo e a observação.");

    await page.goto("/admin/mes");
    await page.getByRole("button", { name: "Com recusa" }).click();
    await page.getByPlaceholder("Buscar cliente por nome ou CPF/CNPJ").fill(customerName);
    await expect(page.getByRole("row").filter({ hasText: customerName }).first()).toBeVisible();
  });

  test("cliente vê a recusa no Início e envia de novo", async ({ browser }) => {
    const page = await as(browser, CUSTOMER_STATE);
    await page.goto("/app");
    await expect(page.getByText(`Envie de novo: ${itemTitle}`)).toBeVisible();
    await page.goto("/app/documentos");
    await expect(request(page, itemTitle)).toContainText("A Exactra pediu um novo envio");
    await page.getByLabel(itemTitle, { exact: true }).setInputFiles(file("documento-notas-servico-teste.pdf"));
    await expect(request(page, itemTitle)).toContainText("Enviado", { timeout: 30_000 });
  });

  test("equipe publica a guia a partir do PDF", async ({ browser }) => {
    const page = await as(browser, ADMIN_STATE);
    await page.goto(`/admin/guias/nova?cliente=${customerId}`);
    await expect(page.locator("#customer")).toHaveValue(customerId);

    await page.getByLabel("PDF da guia").setInputFiles(file("guia-das-teste.pdf"));
    await expect(page.getByText("O que encontramos no PDF")).toBeVisible({ timeout: 45_000 });
    const form = page.locator("form");
    // The value only comes from a barcode line; the test PDFs have none, so the person types it.
    await expect(page.getByText("Nenhuma linha digitável válida encontrada")).toBeVisible();
    await expect(form.locator("select").nth(1)).toHaveValue("DAS");
    await expect(form.locator('input[type="month"]')).not.toHaveValue("");
    await form.locator('input[inputmode="decimal"]').fill("412,50");

    // A typed line with a wrong check digit is refused.
    const barcode = form.locator('input[inputmode="numeric"]');
    await barcode.fill("8".repeat(48));
    await expect(page.getByText("Linha inválida: algum dígito verificador não bate.")).toBeVisible();
    await barcode.fill("");

    await form.getByPlaceholder("Ex.: ISS de setembro – Niterói").fill(guideLabel);
    // Due in 10 days so the guide shows as "A pagar" (the test PDF date may be in the past).
    const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    await form.locator('input[type="date"]').fill(due);
    const submit = page.getByRole("button", { name: "Publicar e avisar o cliente" });
    await expect(submit).toBeDisabled();
    await page.getByLabel("Conferi o valor, o vencimento e o cliente").check();
    await submit.click();
    await expect(page.getByText("Guia publicada. O cliente recebeu um e-mail.")).toBeVisible();
    const [y, m, d] = due.split("-");
    expectEmail(FLOW, CUSTOMER.email, `Nova guia: ${guideLabel}, vence em ${d}/${m}/${y}`, "Formato exato da data pode variar (ex.: 03/11).");
  });

  test("cliente copia o código, marca como paga com comprovante e desfaz", async ({ browser }) => {
    const page = await as(browser, CUSTOMER_STATE);
    await page.goto("/app/guias");
    const slip = page.locator("article").filter({ hasText: guideLabel });
    await expect(slip).toBeVisible();

    const copy = slip.getByRole("button", { name: "Copiar código" });
    if (await copy.count()) {
      await copy.click();
      await expect(slip.getByText("Código copiado")).toBeVisible();
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      expect(clip.replace(/\D/g, "").length).toBeGreaterThanOrEqual(44);
    } else {
      await expect(slip).toContainText("Pague pelo PDF");
    }

    await slip.getByRole("button", { name: "Já paguei" }).click();
    const dialog = page.locator("dialog[open]");
    await dialog.getByLabel("Anexar comprovante").setInputFiles(file("documento-extrato-bancario-teste.pdf"));
    await expect(dialog.getByText(/Comprovante: /)).toBeVisible({ timeout: 30_000 });
    await dialog.getByRole("button", { name: "Confirmar pagamento" }).click();

    await page.getByRole("tab", { name: "Pagas" }).click();
    const paid = page.locator("article").filter({ hasText: guideLabel });
    await expect(paid).toContainText("Marcada como paga em");
    await paid.getByRole("button", { name: "Desfazer" }).click();
    await page.getByRole("tab", { name: "A pagar" }).click();
    await expect(page.locator("article").filter({ hasText: guideLabel })).toBeVisible();

    // Mark as paid again so the team sees it.
    await page.locator("article").filter({ hasText: guideLabel }).getByRole("button", { name: "Já paguei" }).click();
    await page.locator("dialog[open]").getByLabel("Anexar comprovante").setInputFiles(file("documento-extrato-bancario-teste.pdf"));
    await expect(page.locator("dialog[open]").getByText(/Comprovante: /)).toBeVisible({ timeout: 30_000 });
    await page.locator("dialog[open]").getByRole("button", { name: "Confirmar pagamento" }).click();
    await page.getByRole("tab", { name: "Pagas" }).click();
    await expect(page.locator("article").filter({ hasText: guideLabel })).toContainText("Marcada como paga em");
  });

  test("equipe vê a guia paga com o comprovante", async ({ browser }) => {
    const page = await as(browser, ADMIN_STATE);
    await openCustomerById(page, customerId, "Guias");
    const row = page.getByRole("listitem").filter({ hasText: guideLabel });
    await expect(row).toBeVisible();
    await expect(row.getByRole("button", { name: "Comprovante" })).toBeVisible();
  });

  test("cliente baixa o mês inteiro em ZIP", async ({ browser }) => {
    const page = await as(browser, CUSTOMER_STATE);
    await page.goto("/app/documentos");
    const link = page.getByRole("link", { name: "Baixar tudo deste mês (ZIP)" });
    await expect(link).toBeVisible();
    const download = page.waitForEvent("download");
    await link.click();
    const zip = await download;
    expect(zip.suggestedFilename()).toMatch(/\.zip$/);
  });

  test("equipe desliga o item de teste", async ({ browser }) => {
    const page = await as(browser, ADMIN_STATE);
    await openCustomerById(page, customerId, "Checklist");
    const item = page.getByRole("listitem").filter({ hasText: itemTitle });
    await item.getByRole("button", { name: "Desligar" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: itemTitle })).toHaveCount(0);
  });
});
