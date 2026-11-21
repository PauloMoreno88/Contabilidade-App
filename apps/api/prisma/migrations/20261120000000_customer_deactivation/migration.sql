-- Soft delete of a customer (docs/specs/remover-cliente.md): set by "Desativar", cleared by "Reativar".
ALTER TABLE "Customer" ADD COLUMN "deactivatedAt" TIMESTAMP(3);

CREATE INDEX "Customer_deactivatedAt_idx" ON "Customer"("deactivatedAt");
