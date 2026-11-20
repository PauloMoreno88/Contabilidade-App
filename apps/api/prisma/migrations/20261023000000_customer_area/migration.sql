-- CreateEnum
CREATE TYPE "ContractSource" AS ENUM ('CHECKOUT', 'MANUAL');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('DOCUMENT', 'GUIDE', 'RECEIPT');

-- CreateEnum
CREATE TYPE "DocumentRequestStatus" AS ENUM ('PENDING', 'SENT', 'REJECTED');

-- CreateEnum
CREATE TYPE "GuideType" AS ENUM ('DAS', 'DARF', 'FGTS', 'INSS', 'ISS', 'ICMS', 'IRPF', 'OTHER');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "disabledItemIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "onboardedAt" TIMESTAMP(3),
ADD COLUMN     "profile" JSONB,
ADD COLUMN     "remindersEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "source" "ContractSource" NOT NULL DEFAULT 'CHECKOUT';

-- CreateTable
CREATE TABLE "CompanyMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'OWNER',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerInvite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "kind" "FileKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "competence" TEXT NOT NULL,
    "requestId" TEXT,
    "uploadedById" TEXT,
    "byStaff" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "appliesTo" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "itemId" TEXT,
    "competence" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "dueDate" DATE NOT NULL,
    "status" "DocumentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "rejectionNote" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxGuide" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "GuideType" NOT NULL,
    "label" TEXT,
    "competence" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "barcode" TEXT,
    "fileId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "receiptFileId" TEXT,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyMember_customerId_idx" ON "CompanyMember"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMember_userId_customerId_key" ON "CompanyMember"("userId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerInvite_tokenHash_key" ON "CustomerInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "CustomerInvite_userId_idx" ON "CustomerInvite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_storageKey_key" ON "StoredFile"("storageKey");

-- CreateIndex
CREATE INDEX "StoredFile_customerId_competence_idx" ON "StoredFile"("customerId", "competence");

-- CreateIndex
CREATE INDEX "StoredFile_uploadedAt_idx" ON "StoredFile"("uploadedAt");

-- CreateIndex
CREATE INDEX "ChecklistItem_customerId_idx" ON "ChecklistItem"("customerId");

-- CreateIndex
CREATE INDEX "DocumentRequest_competence_status_idx" ON "DocumentRequest"("competence", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRequest_customerId_competence_itemId_key" ON "DocumentRequest"("customerId", "competence", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxGuide_fileId_key" ON "TaxGuide"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxGuide_receiptFileId_key" ON "TaxGuide"("receiptFileId");

-- CreateIndex
CREATE INDEX "TaxGuide_customerId_dueDate_idx" ON "TaxGuide"("customerId", "dueDate");

-- CreateIndex
CREATE INDEX "TaxGuide_dueDate_paidAt_idx" ON "TaxGuide"("dueDate", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_customerId_kind_ref_key" ON "NotificationLog"("customerId", "kind", "ref");

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvite" ADD CONSTRAINT "CustomerInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DocumentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ChecklistItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxGuide" ADD CONSTRAINT "TaxGuide_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxGuide" ADD CONSTRAINT "TaxGuide_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxGuide" ADD CONSTRAINT "TaxGuide_receiptFileId_fkey" FOREIGN KEY ("receiptFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Checklist templates. PLACEHOLDER: example items until the accountant answers (issue #62); editable in /admin/checklist.
INSERT INTO "ChecklistItem" ("id", "title", "description", "required", "appliesTo", "active", "sortOrder", "updatedAt") VALUES
  ('tpl_extratos', 'Extratos bancários', 'Extrato do mês inteiro de cada conta da empresa, em PDF ou OFX.', true, '{}', true, 10, CURRENT_TIMESTAMP),
  ('tpl_notas_servico', 'Notas fiscais de serviço emitidas', 'Se emitiu nota fora do sistema da prefeitura que acompanhamos, envie o PDF ou o XML.', false, '{"activities":["servicos","ambos"]}', true, 20, CURRENT_TIMESTAMP),
  ('tpl_notas_compra', 'Notas fiscais de compra', 'XML ou PDF das notas de mercadorias e insumos comprados no mês.', true, '{"activities":["comercio","ambos"]}', true, 30, CURRENT_TIMESTAMP),
  ('tpl_folha', 'Ponto e ocorrências dos funcionários', 'Folha de ponto, faltas, horas extras, férias, admissões e desligamentos do mês.', true, '{"hasEmployees":true}', true, 40, CURRENT_TIMESTAMP),
  ('tpl_despesas', 'Comprovantes de despesas', 'Aluguel, contas e outras despesas pagas pela empresa. Ajuda a fechar o mês com mais precisão.', false, '{}', true, 50, CURRENT_TIMESTAMP);
