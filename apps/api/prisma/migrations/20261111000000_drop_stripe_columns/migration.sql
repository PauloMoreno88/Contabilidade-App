-- Decision 40 (docs/plano.md): Stripe left the code on 11/11/2026 (decision 42). Production has no
-- checkout yet; staging only loses the ids of Stripe test payments. The STRIPE enum value stays for
-- the old staging contracts that still carry it.

-- Event key of any provider (Mercado Pago keys use the "mp:" prefix).
ALTER TABLE "WebhookEvent" RENAME COLUMN "stripeEventId" TO "eventId";
ALTER INDEX "WebhookEvent_stripeEventId_key" RENAME TO "WebhookEvent_eventId_key";

ALTER TABLE "Contract" ALTER COLUMN "provider" SET DEFAULT 'MERCADO_PAGO';

DROP INDEX "Customer_stripeCustomerId_idx";
ALTER TABLE "Customer" DROP COLUMN "stripeCustomerId";

DROP INDEX "Contract_stripeSessionId_key";
DROP INDEX "Contract_stripeSubscriptionId_key";
ALTER TABLE "Contract" DROP COLUMN "stripeSessionId", DROP COLUMN "stripeSubscriptionId";

DROP INDEX "Payment_stripeInvoiceId_key";
ALTER TABLE "Payment" DROP COLUMN "stripePaymentIntentId", DROP COLUMN "stripeInvoiceId";
