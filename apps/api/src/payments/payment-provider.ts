import type { BillingPeriod, PaymentMethod, PaymentProviderId, PlanId } from '@exactra/shared';

export interface CheckoutRequest {
  contractId: string;
  plan: PlanId;
  period: BillingPeriod;
  method: PaymentMethod;
  amountCents: number;
  customer: { name: string; email: string };
  successUrl: string;
  cancelUrl: string;
}

/** Provider-agnostic payment events that drive the contract lifecycle. */
export type PaymentEvent =
  /** One-year contract paid (card, Pix or boleto), immediately or after async confirmation. */
  | { type: 'prepaid.paid'; contractId: string; provider: PaymentProviderId; mercadoPagoPaymentId: string; method?: PaymentMethod; amountCents: number }
  /** Full refund or chargeback of a Mercado Pago payment: cancels the contract that payment activated. */
  | { type: 'payment.reversed'; contractId: string; mercadoPagoPaymentId: string; reason: 'REFUND' | 'CHARGEBACK' }
  /** Needs a person, the contract does not change. */
  | { type: 'payment.attention'; contractId: string; mercadoPagoPaymentId: string; reason: 'PARTIAL_REFUND' | 'DISPUTE' | 'CHARGEBACK_REVERSED' };

export interface VerifiedWebhook {
  id: string;
  type: string;
  payload: object;
  /** null when the event does not affect contracts. */
  event: PaymentEvent | null;
}

/** Every new contract is a one-off prepaid payment for one year (card, Pix or boleto). */
export abstract class PaymentProvider {
  /** False when no API key is configured. */
  abstract readonly configured: boolean;
  /** True with live (real money) keys. */
  abstract readonly liveMode: boolean;
  abstract createCheckout(req: CheckoutRequest): Promise<{ sessionId: string; url: string }>;
  /** Verifies the signature (throws if invalid) and normalizes the event. */
  abstract verifyWebhook(rawBody: Buffer, signature: string, requestId?: string, dataId?: string): VerifiedWebhook | Promise<VerifiedWebhook>;
}
