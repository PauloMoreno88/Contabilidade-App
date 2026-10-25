import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PERIOD_MONTHS, PLANS, type PaymentMethod } from '@exactra/shared';
import { z } from 'zod';
import { CheckoutRequest, PaymentProvider, type VerifiedWebhook } from './payment-provider.js';

const preferenceSchema = z.object({ id: z.string(), init_point: z.string().url() });
const paymentSchema = z.object({
  id: z.union([z.string(), z.number()]),
  status: z.string(),
  external_reference: z.string().nullable().optional(),
  transaction_amount: z.number(),
  payment_type_id: z.string(),
});

export class InvalidMercadoPagoNotification extends Error {}

@Injectable()
export class MercadoPagoProvider extends PaymentProvider {
  private readonly token = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? '';
  private readonly webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? '';
  // Test and production access tokens both start with APP_USR; mode must be explicit.
  private readonly mode = process.env.MERCADO_PAGO_MODE;
  readonly configured = Boolean(this.token && this.webhookSecret && (this.mode === 'test' || this.mode === 'live'));
  readonly liveMode = this.mode === 'live';

  async createCheckout(req: CheckoutRequest) {
    const preference = preferenceSchema.parse(await this.api('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ id: req.plan, title: `${PLANS[req.plan].name} (${PERIOD_MONTHS[req.period]} meses)`, quantity: 1, currency_id: 'BRL', unit_price: req.amountCents / 100 }],
        payer: { email: req.customer.email, name: req.customer.name },
        external_reference: req.contractId,
        back_urls: { success: req.successUrl, pending: req.successUrl, failure: req.cancelUrl },
        auto_return: 'approved',
        payment_methods: { installments: PLANS[req.plan].maxInstallments },
      }),
    }));
    return { sessionId: preference.id, url: preference.init_point };
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
    if (!ts || !/^\d+$/.test(ts) || Math.abs(Date.now() - Number(ts)) > 300_000 || !received || !/^[0-9a-f]{64}$/i.test(received)) throw new InvalidMercadoPagoNotification('Invalid signature');
    const expected = createHmac('sha256', this.webhookSecret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest();
    if (!timingSafeEqual(expected, Buffer.from(received, 'hex'))) throw new InvalidMercadoPagoNotification('Invalid signature');

    // A notification signals a change; only the authenticated payment API decides the contract state.
    const payment = paymentSchema.parse(await this.api(`/v1/payments/${encodeURIComponent(dataId)}`));
    if (String(payment.id) !== dataId) throw new InvalidMercadoPagoNotification('Payment id mismatch');
    const method: PaymentMethod = payment.payment_type_id === 'credit_card' ? 'CARD' : payment.payment_type_id === 'bank_transfer' ? 'PIX' : payment.payment_type_id === 'ticket' ? 'BOLETO' : 'OTHER';
    return {
      id: `mp:${dataId}:${payment.status}`,
      type: `payment.${payment.status}`,
      payload: payment,
      event: payment.status === 'approved' && payment.external_reference ? {
        type: 'prepaid.paid', contractId: payment.external_reference, provider: 'MERCADO_PAGO',
        mercadoPagoPaymentId: dataId, method, amountCents: Math.round(payment.transaction_amount * 100),
      } : null,
    };
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
