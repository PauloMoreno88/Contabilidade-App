import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PERIOD_MONTHS, PLANS, type PaymentMethod } from '@exactra/shared';
import { z } from 'zod';
import { CheckoutRequest, PaymentProvider, type PaymentEvent, type VerifiedWebhook } from './payment-provider.js';

const DAY = 86400_000;
/** The checkout link (and any Pix or boleto generated from it) stops accepting payments after this. */
export const MERCADO_PAGO_LINK_DAYS = 3;
/** Link lifetime plus time for a boleto paid on the last day to clear; then the daily job cancels the contract. */
export const MERCADO_PAGO_PENDING_DAYS = 8;

const preferenceSchema = z.object({ id: z.string(), init_point: z.string().url() });
const paymentSchema = z.object({
  id: z.union([z.string(), z.number()]),
  status: z.string(),
  status_detail: z.string().nullable().optional(),
  external_reference: z.string().nullable().optional(),
  transaction_amount: z.number(),
  transaction_amount_refunded: z.number().nullable().optional(),
  payment_type_id: z.string(),
});
type MercadoPagoPayment = z.infer<typeof paymentSchema>;

/** ISO 8601 with the São Paulo offset, the format of the Mercado Pago examples. */
const brasiliaIso = (ms: number) => new Date(ms - 3 * 3600_000).toISOString().replace('Z', '-03:00');

export class InvalidMercadoPagoNotification extends Error {}

/**
 * Maps the payment's current state to a contract event and an idempotency key.
 * Rejected and cancelled do nothing: the buyer can retry on the same link, so the daily job cancels instead.
 */
function classify(payment: MercadoPagoPayment, dataId: string, method: PaymentMethod): { key: string; event: PaymentEvent | null } {
  const { status, status_detail: detail, external_reference: contractId } = payment;
  const base = `mp:${dataId}:${status}`;
  if (!contractId) return { key: base, event: null };
  const ids = { contractId, mercadoPagoPaymentId: dataId };

  if (status === 'refunded') return { key: base, event: { type: 'payment.reversed', ...ids, reason: 'REFUND' } };
  if (status === 'charged_back') {
    return detail === 'reimbursed'
      ? { key: `${base}:reimbursed`, event: { type: 'payment.attention', ...ids, reason: 'CHARGEBACK_REVERSED' } }
      : { key: base, event: { type: 'payment.reversed', ...ids, reason: 'CHARGEBACK' } };
  }
  if (status === 'in_mediation' || detail === 'in_mediation') {
    return { key: `mp:${dataId}:in_mediation`, event: { type: 'payment.attention', ...ids, reason: 'DISPUTE' } };
  }
  if (status !== 'approved') return { key: base, event: null };
  if (detail === 'partially_refunded') {
    // A partial refund keeps the status approved: the refunded total tells one refund from the next.
    return { key: `mp:${dataId}:partial:${payment.transaction_amount_refunded ?? 0}`, event: { type: 'payment.attention', ...ids, reason: 'PARTIAL_REFUND' } };
  }
  return {
    key: base,
    event: { type: 'prepaid.paid', ...ids, provider: 'MERCADO_PAGO', method, amountCents: Math.round(payment.transaction_amount * 100) },
  };
}

@Injectable()
export class MercadoPagoProvider extends PaymentProvider {
  private readonly token = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? '';
  private readonly webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? '';
  // Test and production access tokens both start with APP_USR; mode must be explicit.
  private readonly mode = process.env.MERCADO_PAGO_MODE;
  readonly configured = Boolean(this.token && this.webhookSecret && (this.mode === 'test' || this.mode === 'live'));
  readonly liveMode = this.mode === 'live';

  async createCheckout(req: CheckoutRequest) {
    const now = Date.now();
    const expiresAt = brasiliaIso(now + MERCADO_PAGO_LINK_DAYS * DAY);
    const preference = preferenceSchema.parse(await this.api('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ id: req.plan, title: `${PLANS[req.plan].name} (${PERIOD_MONTHS[req.period]} meses)`, quantity: 1, currency_id: 'BRL', unit_price: req.amountCents / 100 }],
        payer: { email: req.customer.email, name: req.customer.name },
        external_reference: req.contractId,
        back_urls: { success: req.successUrl, pending: req.successUrl, failure: req.cancelUrl },
        auto_return: 'approved',
        payment_methods: { installments: PLANS[req.plan].maxInstallments },
        expires: true,
        expiration_date_from: brasiliaIso(now),
        expiration_date_to: expiresAt,
        date_of_expiration: expiresAt,
      }),
    }));
    return { sessionId: preference.id, url: preference.init_point };
  }

  /** Link of an existing preference, to resume a checkout the customer left. */
  async checkoutUrl(preferenceId: string): Promise<string> {
    return preferenceSchema.parse(await this.api(`/checkout/preferences/${encodeURIComponent(preferenceId)}`)).init_point;
  }

  async verifyWebhook(rawBody: Buffer, signature: string, requestId?: string, dataId?: string): Promise<VerifiedWebhook> {
    let body: { type: string; data: { id: string | number } };
    try {
      body = z.object({ type: z.string(), data: z.object({ id: z.union([z.string(), z.number()]) }) }).parse(JSON.parse(rawBody.toString('utf8')));
    } catch {
      throw new InvalidMercadoPagoNotification('Invalid notification');
    }
    if (!this.webhookSecret || body.type !== 'payment' || String(body.data.id) !== dataId || !requestId) throw new InvalidMercadoPagoNotification('Invalid notification');
    const fields = Object.fromEntries(signature.split(',').map((part) => part.trim().split('=')));
    const ts = fields.ts;
    const received = fields.v1;
    // No age limit on ts: its unit varies in the docs and a retry may keep the original value. A replay is
    // harmless, since events are idempotent and the state below always comes from the payment API.
    if (!ts || !/^\d+$/.test(ts) || !received || !/^[0-9a-f]{64}$/i.test(received)) throw new InvalidMercadoPagoNotification('Invalid signature');
    const expected = createHmac('sha256', this.webhookSecret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest();
    if (!timingSafeEqual(expected, Buffer.from(received, 'hex'))) throw new InvalidMercadoPagoNotification('Invalid signature');

    // A notification signals a change; only the authenticated payment API decides the contract state.
    const payment = paymentSchema.parse(await this.api(`/v1/payments/${encodeURIComponent(dataId)}`));
    if (String(payment.id) !== dataId) throw new InvalidMercadoPagoNotification('Payment id mismatch');
    const method: PaymentMethod = payment.payment_type_id === 'credit_card' ? 'CARD' : payment.payment_type_id === 'bank_transfer' ? 'PIX' : payment.payment_type_id === 'ticket' ? 'BOLETO' : 'OTHER';
    const { key, event } = classify(payment, dataId, method);
    return { id: key, type: `payment.${payment.status}`, payload: payment, event };
  }

  private async api(path: string, init?: RequestInit): Promise<unknown> {
    const response = await fetch(`https://api.mercadopago.com${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Mercado Pago API returned ${response.status}`);
    return response.json();
  }
}
