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
  /** Prepaid contract (card, Pix or boleto): money is in (immediately or after async confirmation). */
  | { type: 'prepaid.paid'; contractId: string; provider: PaymentProviderId; customerId?: string; paymentIntentId?: string; mercadoPagoPaymentId?: string; method?: PaymentMethod; amountCents: number }
  /** Async payment failed or the checkout expired before paying. */
  | { type: 'checkout.failed'; contractId: string }
  /** Legacy monthly card subscriptions (sold before decision 22) keep sending these events. */
  | { type: 'subscription.started'; contractId: string; subscriptionId: string; customerId?: string }
  | {
      type: 'invoice.paid';
      contractId?: string;
      subscriptionId: string;
      invoiceId: string;
      amountCents: number;
      periodEnd: Date;
    }
  | { type: 'invoice.failed'; subscriptionId: string }
  | { type: 'subscription.canceled'; subscriptionId: string };

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
