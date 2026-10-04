import Stripe from 'stripe';

// Minimal Stripe event payloads (only the fields the API reads), signed like Stripe does.
let seq = 0;
const event = (type: string, object: object) => ({
  id: `evt_test_${++seq}`,
  object: 'event',
  type,
  livemode: false,
  created: Math.floor(Date.now() / 1000),
  data: { object },
});

export const checkoutCompleted = (contractId: string, o: { mode: 'payment' | 'subscription'; paid: boolean }) =>
  event('checkout.session.completed', {
    id: `cs_test_${seq}`,
    object: 'checkout.session',
    mode: o.mode,
    payment_status: o.paid ? 'paid' : 'unpaid',
    metadata: { contractId },
    customer: 'cus_test_1',
    subscription: o.mode === 'subscription' ? `sub_${contractId}` : null,
    payment_intent: o.mode === 'payment' ? 'pi_test_1' : null,
    amount_total: 1000,
  });

export const asyncPayment = (contractId: string, ok: boolean) =>
  event(ok ? 'checkout.session.async_payment_succeeded' : 'checkout.session.async_payment_failed', {
    id: 'cs_test_async',
    object: 'checkout.session',
    mode: 'payment',
    payment_status: ok ? 'paid' : 'unpaid',
    metadata: { contractId },
    customer: 'cus_test_1',
    payment_intent: 'pi_test_2',
    amount_total: 1000,
  });

export const invoice = (type: 'invoice.paid' | 'invoice.payment_failed', subscriptionId: string, periodEnd: Date) =>
  event(type, {
    id: `in_test_${seq}`,
    object: 'invoice',
    amount_paid: 39900,
    period_end: Math.floor(periodEnd.getTime() / 1000),
    parent: { type: 'subscription_details', subscription_details: { subscription: subscriptionId, metadata: {} } },
    lines: { data: [{ period: { start: 0, end: Math.floor(periodEnd.getTime() / 1000) } }] },
  });

export const subscriptionDeleted = (subscriptionId: string) =>
  event('customer.subscription.deleted', { id: subscriptionId, object: 'subscription' });

export function sign(payload: string): string {
  return new Stripe('sk_test_unset').webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
}
