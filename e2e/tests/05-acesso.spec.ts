import { expect, request, test } from "@playwright/test";
import { ADMIN_STATE, CUSTOMER_STATE } from "../lib/data";
import { expectEmail } from "../lib/emails";
import { ADMIN, API_URL, CUSTOMER } from "../lib/env";
import { customerCompanyId, signIn } from "../lib/pages";

// Fluxo 5: Entrar, recuperar a senha e segurança.
// The customer's two-step verification is not turned on here (it would change the shared test account).
const FLOW = "Fluxo 5: Entrar, recuperar a senha e segurança";

test.describe(FLOW, () => {
  test("senha errada e entrada do cliente", async ({ page }) => {
    // Better Auth allows a few sign-ins per 10 s; the setup has just signed in twice.
    await page.waitForTimeout(11_000);
    await signIn(page, CUSTOMER.email, "senha-errada-123");
    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();

    await signIn(page, CUSTOMER.email, CUSTOMER.password);
    await page.waitForURL(/\/app/);
    await expect(page.getByRole("link", { name: "Documentos" }).first()).toBeVisible();
  });

  // Used to bounce between /admin and /entrar (fixed 24/10/2026); a loop would also hit Better Auth's rate limit.
  test("cliente não abre o painel da equipe (sem loop de redirecionamento)", async ({ browser }) => {
    const context = await browser.newContext({ storageState: CUSTOMER_STATE });
    const page = await context.newPage();
    let navigations = 0;
    page.on("framenavigated", (f) => f === page.mainFrame() && navigations++);
    await page.goto("/admin/clientes");
    await page.waitForTimeout(5_000);
    const url = page.url();
    await context.close();
    // Let the auth rate-limit window reset before the next tests.
    await new Promise((r) => setTimeout(r, 10_000));
    expect(navigations, `${navigations} navegações em 5 s (loop entre /admin e /entrar)`).toBeLessThanOrEqual(4);
    expect(url).toMatch(/\/app/);
  });

  test("equipe não abre a área do cliente", async ({ browser }) => {
    const page = await (await browser.newContext({ storageState: ADMIN_STATE })).newPage();
    await page.goto("/app/documentos");
    await expect(page).toHaveURL(/\/admin\/mes/, { timeout: 15_000 });
  });

  test("arquivo de outra empresa responde 404", async () => {
    const customerId = await customerCompanyId();
    const admin = await request.newContext({ storageState: ADMIN_STATE });
    const list = await (await admin.get(`${API_URL}/admin/customers?pageSize=50`)).json();
    let foreignFile: string | undefined;
    for (const c of list.items as { id: string }[]) {
      if (c.id === customerId) continue;
      const docs = await (await admin.get(`${API_URL}/admin/customers/${c.id}/documents`)).json();
      foreignFile = [...(docs.requests ?? []).flatMap((r: { files: { id: string }[] }) => r.files), ...(docs.others ?? [])][0]?.id;
      if (foreignFile) break;
    }
    await admin.dispose();
    test.skip(!foreignFile, "Nenhum arquivo de outra empresa no ambiente de testes");

    const customer = await request.newContext({ storageState: CUSTOMER_STATE });
    const res = await customer.get(`${API_URL}/app/files/${foreignFile}/download`);
    expect(res.status()).toBe(404);
    await customer.dispose();
  });

  test("link de acesso por e-mail", async ({ page }) => {
    await page.goto("/entrar");
    await page.getByRole("tab", { name: "Link por e-mail" }).click();
    await page.getByLabel("E-mail").fill(CUSTOMER.email);
    await page.getByRole("button", { name: "Enviar link" }).click();
    await expect(page.getByText(new RegExp(`Se ${CUSTOMER.email.replace(".", "\\.")} tiver acesso`))).toBeVisible();
    expectEmail(FLOW, CUSTOMER.email, "Seu link para entrar na Exactra", "Vale 15 minutos e só uma vez.");
  });

  test("esqueci minha senha (cliente e equipe)", async ({ page }) => {
    for (const email of [CUSTOMER.email, ADMIN.email]) {
      await page.goto("/entrar");
      await page.getByRole("link", { name: "Esqueci minha senha" }).click();
      await expect(page).toHaveURL(/esqueci-senha/);
      await page.getByLabel("E-mail").fill(email);
      await page.getByRole("button", { name: "Enviar link" }).click();
      await expect(page.getByText("Se o e-mail estiver cadastrado, o link chega em alguns minutos.")).toBeVisible();
      expectEmail(FLOW, email, "Redefinir sua senha da Exactra", "Não use o link se não quiser trocar a senha; a senha atual continua valendo.");
    }
  });

  test("endereço antigo /admin/login leva para /entrar", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page).toHaveURL(/\/entrar/);
  });
});
