import { expect, test } from "@playwright/test";
import { expectEmail } from "../lib/emails";
import { alias, API_URL, RUN_ID, TEAM_INBOX } from "../lib/env";
import {
  askBuyer,
  assertTestCredentials,
  contractStatus,
  createCheckout,
  paymentsOf,
  PRICE,
  record,
  sendWebhook,
  waitForPayment,
  waitForStatus,
  type Checkout,
  type MpPayment,
} from "../lib/mercado-pago";

// Pagamentos reais no Mercado Pago de teste (docs/specs/mercado-pago-e2e.md).
// The buyer pays by hand: Mercado Pago blocks automated browsers. Everything else is checked here.
// Mercado Pago does notify test payments (seen on 11/11/2026, despite older docs saying otherwise), but the
// test also sends each notification itself, signed with the app's secret, so it never depends on delivery
// timing; a repeated notification is a no-op and the API always reads the real payment from Mercado Pago.
const FLOW = "Mercado Pago: pagamentos de teste";
const CARD = "Mastercard 5031 4332 1540 6351, CVV 123, validade 11/30, CPF do titular 12345678909";

test.describe.serial(FLOW, () => {
  let card: Checkout;
  let approved: MpPayment;

  test.beforeAll(async () => {
    await assertTestCredentials();
    record(`\n##### Rodada ${RUN_ID} #####`);
  });

  test("notificação sem assinatura válida responde 400", async () => {
    const bad = await sendWebhook("123456", { secret: "segredo-errado" });
    expect(bad.status).toBe(400);
    const unsigned = await fetch(`${API_URL}/webhooks/mercado-pago?data.id=123456`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "payment", data: { id: "123456" } }),
    });
    expect(unsigned.status).toBe(400);
  });

  test("cartão recusado não ativa; nova tentativa em 12x ativa", async ({ page }) => {
    test.setTimeout(30 * 60_000);
    const name = `E2E MP Cartao ${RUN_ID}`;
    const email = alias("mp-cartao");
    card = await createCheckout(page, name, email);
    askBuyer("Cartão: recusa e nova tentativa", card, [
      `Pague com cartão, nome do titular OTHE (recusa). ${CARD}.`,
      "Na mesma página, tente de novo com o nome do titular APRO, em 12 parcelas.",
      "Anote o total com juros que o Mercado Pago mostrar.",
    ]);

    // Either order works: a rejection never changes the contract, before or after the approval.
    const rejected = await waitForPayment(card.contractId, (p) => p.status === "rejected");
    const approvedFirst = (await paymentsOf(card.contractId)).some((p) => p.status === "approved");
    expect((await sendWebhook(String(rejected.id))).status).toBe(200);
    if (!approvedFirst) expect(await contractStatus(card)).toBe("PENDING_PAYMENT");
    record(`Recusa ${approvedFirst ? "depois" : "antes"} da aprovação: não mudou o contrato.`);

    approved = await waitForPayment(card.contractId, (p) => p.status === "approved");
    record(
      `Aprovado: ${approved.installments}x, transaction_amount=${approved.transaction_amount}, ` +
        `total pago pelo comprador=${approved.transaction_details?.total_paid_amount ?? "?"}`,
    );
    // If Mercado Pago folds the interest into transaction_amount, the API sees a mismatch and does not activate.
    expect(approved.transaction_amount, "transaction_amount deve ser o preço, sem juros").toBe(PRICE);
    // The test card offers only 1x in the test account: 12x is checked with a real card before launch.
    if (approved.installments !== 12) record(`Atenção: pago em ${approved.installments}x; o 12x fica para o teste com cartão real.`);
    expect((await sendWebhook(String(approved.id))).status).toBe(200);
    await waitForStatus(card, "ACTIVE");
    // A rejection after the approval must not undo it.
    expect((await sendWebhook(String(rejected.id))).status).toBe(200);
    expect(await contractStatus(card)).toBe("ACTIVE");

    expectEmail(FLOW, email, "Boas-vindas à Exactra, E2E", "Contrato pago pelo Mercado Pago.");
    expectEmail(FLOW, TEAM_INBOX, `Nova contratação: ${name} (Plano Exactra)`);
  });

  test("notificação repetida não aplica de novo", async () => {
    test.skip(!approved, "depende do pagamento aprovado");
    const res = await sendWebhook(String(approved.id));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, duplicate: true });
    expect(await contractStatus(card)).toBe("ACTIVE");
  });

  test("reembolso parcial mantém o contrato e avisa a equipe", async () => {
    test.skip(!approved, "depende do pagamento aprovado");
    test.setTimeout(20 * 60_000);
    askBuyer("Reembolso parcial", card, [
      "Não abra o link acima. Entre no Mercado Pago com o VENDEDOR de teste.",
      `Em Atividade (ou Vendas), abra o pagamento ${approved.id} e devolva só R$ 1,00.`,
    ]);
    await waitForPayment(card.contractId, (p) => p.id === approved.id && p.transaction_amount_refunded > 0);
    expect((await sendWebhook(String(approved.id))).status).toBe(200);
    expect(await contractStatus(card)).toBe("ACTIVE");
    expectEmail(FLOW, TEAM_INBOX, `Reembolso parcial: E2E MP Cartao ${RUN_ID}`, `Pagamento ${approved.id}.`);
  });

  test("reembolso total cancela o contrato", async () => {
    test.skip(!approved, "depende do pagamento aprovado");
    test.setTimeout(20 * 60_000);
    askBuyer("Reembolso total", card, [
      "Ainda com o VENDEDOR de teste, no mesmo pagamento:",
      `Devolva o restante do pagamento ${approved.id}.`,
    ]);
    await waitForPayment(card.contractId, (p) => p.id === approved.id && p.status === "refunded");
    expect((await sendWebhook(String(approved.id))).status).toBe(200);
    await waitForStatus(card, "CANCELED");
    expectEmail(FLOW, TEAM_INBOX, `Pagamento reembolsado: E2E MP Cartao ${RUN_ID}`, `Pagamento ${approved.id}, contrato cancelado.`);
  });

  for (const [label, type, choice] of [
    ["Pix", "bank_transfer", "Escolha Pix e gere o código. NÃO pague."],
    ["boleto", "ticket", "Escolha boleto e gere o boleto. NÃO pague."],
  ] as const) {
    test(`${label} gerado deixa o contrato pendente`, async ({ page }) => {
      test.setTimeout(20 * 60_000);
      const c = await createCheckout(page, `E2E MP ${label} ${RUN_ID}`, alias(`mp-${type}`));
      askBuyer(label, c, [choice]);
      const p = await waitForPayment(c.contractId, (x) => x.payment_type_id === type);
      expect(p.status).toBe("pending");
      expect((await sendWebhook(String(p.id))).status).toBe(200);
      expect(await contractStatus(c)).toBe("PENDING_PAYMENT");
      record(`${label}: pagamento ${p.id} pending, contrato PENDING_PAYMENT (o job cancela em 8 dias).`);
    });
  }
});
