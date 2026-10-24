import { expect, request, type Page } from "@playwright/test";
import { ADMIN_STATE, CUSTOMER_STATE } from "./data";
import { API_URL } from "./env";

/** Signs in through the single entrance (/entrar) with e-mail and password. */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

/** Pays on the Stripe hosted Checkout page (test mode). */
export async function payWithCard(page: Page, number: string, holder: string) {
  await page.waitForURL(/checkout\.stripe\.com/);
  await page.getByRole("textbox", { name: "Número do cartão" }).fill(number);
  await page.getByRole("textbox", { name: "Validade" }).fill("12 / 34");
  await page.getByRole("textbox", { name: /CVC/ }).fill("123");
  await page.getByRole("textbox", { name: "Nome do titular do cartão" }).fill(holder);
  await page.getByRole("button", { name: "Pagar" }).click();
}

type Tab = "Documentos" | "Guias" | "Acesso e dados" | "Checklist";

/** Opens a customer's file in the admin panel, searching the customer list by e-mail or name. Returns the customer id. */
export async function openCustomerFile(page: Page, query: string, tab?: Tab): Promise<string> {
  await page.goto("/admin/clientes");
  await page.getByPlaceholder("Buscar por nome, e-mail ou CPF/CNPJ").fill(query);
  const row = page.getByRole("row").filter({ hasText: query }).first();
  await row.getByRole("link").click();
  await page.waitForURL(/\/admin\/cliente\?id=/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  if (tab) await page.getByRole("tab", { name: tab }).click();
  return new URL(page.url()).searchParams.get("id") ?? "";
}

/** The company behind the test customer's login (several staging customers share that e-mail). */
export async function customerCompanyId(): Promise<string> {
  const api = await request.newContext({ storageState: CUSTOMER_STATE });
  const me = await (await api.get(`${API_URL}/app/me`)).json();
  await api.dispose();
  return me.company.id as string;
}

/** Opens a customer's file in the admin panel by id. */
export async function openCustomerById(page: Page, id: string, tab?: Tab) {
  await page.goto(`/admin/cliente?id=${id}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  if (tab) await page.getByRole("tab", { name: tab }).click();
}

/** Turns off the checklist items left by earlier runs ("E2E …") for one customer. */
export async function removeTestItems(customerId: string) {
  const api = await request.newContext({ storageState: ADMIN_STATE });
  const items: { id: string; title: string; active: boolean }[] = await (await api.get(`${API_URL}/admin/checklist-items?customerId=${customerId}`)).json();
  for (const i of items.filter((i) => i.active && i.title.startsWith("E2E "))) await api.patch(`${API_URL}/admin/checklist-items/${i.id}`, { data: { active: false } });
  await api.dispose();
}
