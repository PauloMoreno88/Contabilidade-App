import { createHmac, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { cpf } from "./data";
import { API_URL, RESULTS_DIR } from "./env";

/** Annual price of the single plan, in reais (PLACEHOLDER, packages/shared/src/plans.config.ts). */
export const PRICE = 3588;

const MP = "https://api.mercadopago.com";
const token = () => need("E2E_MP_ACCESS_TOKEN");

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in e2e/.env: use the TEST credentials of the Mercado Pago app (see e2e/README.md)`);
  return value;
}

async function mp<T>(pathname: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MP}${pathname}`, {
    ...init,
    signal: AbortSignal.timeout(15_000), // A stalled connection must not freeze the polling.
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`Mercado Pago ${pathname} returned ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** Refuses to run with a production token: test and production tokens both start with APP_USR. */
export async function assertTestCredentials() {
  const me = await mp<{ id: number; tags?: string[] }>("/users/me");
  if (!me.tags?.includes("test_user")) {
    throw new Error("E2E_MP_ACCESS_TOKEN is not from a test user. Stop: use the TEST credentials, never production.");
  }
}

export type MpPayment = {
  id: number;
  status: string;
  status_detail: string;
  payment_type_id: string;
  installments: number;
  transaction_amount: number;
  transaction_amount_refunded: number;
  transaction_details?: { total_paid_amount?: number };
};

export async function paymentsOf(contractId: string): Promise<MpPayment[]> {
  const q = new URLSearchParams({ external_reference: contractId, sort: "date_created", criteria: "asc" });
  return (await mp<{ results: MpPayment[] }>(`/v1/payments/search?${q}`)).results;
}

/** Polls until a payment of the contract matches; the buyer is paying by hand meanwhile. */
export async function waitForPayment(contractId: string, match: (p: MpPayment) => boolean, minutes = 15): Promise<MpPayment> {
  let found: MpPayment | undefined;
  await expect
    // A network blip must not end the wait: try again on the next round.
    .poll(async () => (found = (await paymentsOf(contractId).catch(() => [])).find(match)), { timeout: minutes * 60_000, intervals: [5_000] })
    .toBeTruthy();
  return found!;
}

/** Sends a notification signed like Mercado Pago does (x-signature over id, request-id and ts). */
export async function sendWebhook(paymentId: string, opts: { secret?: string } = {}) {
  const requestId = randomUUID();
  const ts = String(Date.now());
  const secret = opts.secret ?? need("E2E_MP_WEBHOOK_SECRET");
  const v1 = createHmac("sha256", secret).update(`id:${paymentId};request-id:${requestId};ts:${ts};`).digest("hex");
  return fetch(`${API_URL}/webhooks/mercado-pago?data.id=${paymentId}&type=payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId },
    body: JSON.stringify({ type: "payment", action: "payment.updated", data: { id: paymentId } }),
  });
}

export type Checkout = { contractId: string; statusToken: string; checkoutUrl: string };

/** Fills the site's checkout and returns the Mercado Pago link, without opening the Mercado Pago page. */
export async function createCheckout(page: Page, name: string, email: string): Promise<Checkout> {
  await page.goto("/checkout");
  await page.locator("#co-name").fill(name);
  await page.locator("#co-email").fill(email);
  await page.locator("#co-phone").fill("11987654321");
  await page.locator("#co-document").fill(cpf());
  await page.locator('input[name="consent"]').check();
  return submitCheckout(page);
}

/** Clicks "Ir para o pagamento" on a filled checkout and returns what the API created; the Mercado Pago page is not opened. */
export async function submitCheckout(page: Page): Promise<Checkout> {
  // Mercado Pago blocks automated browsers: the buyer pays in a real browser instead.
  await page.route(/mercadopago\.com/, (route) => route.abort());
  // Read the API answer before the page leaves for Mercado Pago (the body is gone after navigation).
  let status = 0;
  let body = "";
  await page.route("**/checkout/sessions", async (route) => {
    const res = await route.fetch();
    status = res.status();
    body = await res.text();
    await route.fulfill({ response: res, body });
  });
  await page.getByRole("button", { name: "Ir para o pagamento" }).click();
  await expect.poll(() => status).not.toBe(0);
  expect(status, body).toBe(201);
  const checkout = JSON.parse(body) as Checkout;
  expect(new URL(checkout.checkoutUrl).hostname).toMatch(/mercadopago\.com\.br$/);
  return checkout;
}

export async function contractStatus(c: Checkout): Promise<string> {
  const res = await fetch(`${API_URL}/contracts/${c.contractId}/status?token=${encodeURIComponent(c.statusToken)}`, { signal: AbortSignal.timeout(15_000) });
  expect(res.ok).toBe(true);
  return ((await res.json()) as { status: string }).status;
}

export async function waitForStatus(c: Checkout, status: string, minutes = 3) {
  await expect.poll(() => contractStatus(c), { timeout: minutes * 60_000, intervals: [5_000] }).toBe(status);
}

/** What the tester must do in their own browser, printed in the terminal and saved to results/. */
export function askBuyer(title: string, c: Checkout, steps: string[]) {
  const text = [`\n=== ${title} ===`, `Abra numa janela anônima, logado com o COMPRADOR de teste:`, c.checkoutUrl, ...steps.map((s, i) => `${i + 1}. ${s}`), ""].join("\n");
  console.log(text);
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.appendFileSync(path.join(RESULTS_DIR, "mercado-pago.txt"), text + "\n");
}

export function record(line: string) {
  console.log(line);
  fs.appendFileSync(path.join(RESULTS_DIR, "mercado-pago.txt"), line + "\n");
}
