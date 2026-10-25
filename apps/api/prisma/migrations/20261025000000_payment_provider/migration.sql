ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'OTHER';
CREATE TYPE "PaymentProviderId" AS ENUM ('STRIPE', 'MERCADO_PAGO');
ALTER TABLE "Contract" ADD COLUMN "provider" "PaymentProviderId" NOT NULL DEFAULT 'STRIPE';
ALTER TABLE "Contract" ADD COLUMN "mercadoPagoPreferenceId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "mercadoPagoPaymentId" TEXT;
CREATE UNIQUE INDEX "Contract_mercadoPagoPreferenceId_key" ON "Contract"("mercadoPagoPreferenceId");
CREATE UNIQUE INDEX "Payment_mercadoPagoPaymentId_key" ON "Payment"("mercadoPagoPaymentId");
