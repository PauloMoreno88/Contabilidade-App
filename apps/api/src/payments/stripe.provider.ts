import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PERIOD_MONTHS, PLANS } from '@exactra/shared';
import { CheckoutRequest, PaymentEvent, PaymentProvider, VerifiedWebhook } from './payment-provider.js';

const id = (ref: string | { id: string } | null | undefined) => (typeof ref === 'string' ? ref : ref?.id);

@Injectable()
export class StripeProvider extends PaymentProvider {
  private readonly key = process.env.STRIPE_SECRET_KEY ?? '';
  // Dummy key keeps webhook verification usable when no key is set; API calls are guarded by `configured`.
  readonly stripe = new Stripe(this.key || 'sk_test_unset');
  readonly configured = Boolean(this.key);
  readonly liveMode = this.key.startsWith('sk_live_');

  async createCheckout(req: CheckoutRequest) {
    const plan = PLANS[req.plan];
    const common = {
      client_reference_id: req.contractId,
      metadata: { contractId: req.contractId },
      customer_email: req.customer.email,
      locale: 'pt-BR',
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
    } satisfies Stripe.Checkout.SessionCreateParams;

    const session =
      req.method === 'CARD'
        ? await this.stripe.checkout.sessions.create({
            ...common,
            mode: 'subscription',
            allowed_payment_method_types: ['card'],
            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency: 'brl',
                  unit_amount: req.amountCents,
                  recurring: { interval: 'month' },
                  product_data: { name: `Exactra — Plano ${plan.name} (mensal)` },
                },
              },
            ],
            subscription_data: { metadata: { contractId: req.contractId } },
          })
        : await this.stripe.checkout.sessions.create({
            ...common,
            mode: 'payment',
            customer_creation: 'always',
            allowed_payment_method_types: [req.method === 'PIX' ? 'pix' : 'boleto'],
            payment_method_options:
              req.method === 'PIX' ? { pix: { expires_after_seconds: 86400 } } : { boleto: { expires_after_days: 3 } },
            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency: 'brl',
                  unit_amount: req.amountCents,
                  product_data: { name: `Exactra — Plano ${plan.name} (${PERIOD_MONTHS[req.period]} meses)` },
                },
              },
            ],
            payment_intent_data: { metadata: { contractId: req.contractId } },
          });

    return { sessionId: session.id, url: session.url! };
  }

  verifyWebhook(rawBody: Buffer, signature: string): VerifiedWebhook {
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET ?? '');
    return { id: event.id, type: event.type, payload: event, event: toPaymentEvent(event) };
  }
}

function toPaymentEvent(event: Stripe.Event): PaymentEvent | null {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const s = event.data.object;
      const contractId = s.metadata?.contractId;
      // Boleto/Pix complete the session while still unpaid: wait for async_payment_succeeded.
      if (!contractId || s.payment_status !== 'paid') return null;
      if (s.mode === 'subscription') {
        return { type: 'subscription.started', contractId, subscriptionId: id(s.subscription)!, customerId: id(s.customer) };
      }
      return {
        type: 'prepaid.paid',
        contractId,
        customerId: id(s.customer),
        paymentIntentId: id(s.payment_intent),
        amountCents: s.amount_total ?? 0,
      };
    }
    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired': {
      const contractId = event.data.object.metadata?.contractId;
      return contractId ? { type: 'checkout.failed', contractId } : null;
    }
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const inv = event.data.object;
      const sub = inv.parent?.subscription_details;
      if (!sub) return null;
      const subscriptionId = id(sub.subscription)!;
      if (event.type === 'invoice.payment_failed') return { type: 'invoice.failed', subscriptionId };
      return {
        type: 'invoice.paid',
        subscriptionId,
        contractId: sub.metadata?.contractId,
        invoiceId: inv.id!,
        amountCents: inv.amount_paid,
        periodEnd: new Date((inv.lines.data[0]?.period.end ?? inv.period_end) * 1000),
      };
    }
    case 'customer.subscription.deleted':
      return { type: 'subscription.canceled', subscriptionId: event.data.object.id };
    default:
      return null;
  }
}
