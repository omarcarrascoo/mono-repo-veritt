-- CreateEnum
CREATE TYPE "DailyOpeningStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DailyClosingStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DeviationReportStatus" AS ENUM ('PENDING_CLASSIFICATION', 'CLASSIFIED', 'APPROVED');

-- CreateEnum
CREATE TYPE "DeviationCause" AS ENUM ('ERROR', 'WASTE', 'THEFT', 'ADJUSTMENT', 'OVERPRODUCTION', 'UNDERPRODUCTION', 'OTHER');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'RECONCILED', 'DISCREPANCY');

-- CreateEnum
CREATE TYPE "DailyOperationStatus" AS ENUM ('PENDING', 'SIGNED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "FOPValidationType" AS ENUM ('INVENTORY', 'CASH', 'PROCESSES', 'HOURS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'PRICE_ALERT';
ALTER TYPE "NotificationType" ADD VALUE 'DAILY_OPENING_PENDING';
ALTER TYPE "NotificationType" ADD VALUE 'DAILY_DEVIATION_ALERT';
ALTER TYPE "NotificationType" ADD VALUE 'DAILY_RECONCILIATION_DISCREPANCY';
ALTER TYPE "NotificationType" ADD VALUE 'DAILY_CHAIN_BLOCKED';

-- CreateTable
CREATE TABLE "DailyInventoryOpening" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "operationalDate" DATE NOT NULL,
    "status" "DailyOpeningStatus" NOT NULL DEFAULT 'PENDING',
    "authorizedByUserId" TEXT,
    "authorizedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyInventoryOpening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyInventoryOpeningItem" (
    "id" TEXT NOT NULL,
    "openingId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "countedQuantity" DECIMAL(14,4) NOT NULL,
    "previousClosingQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "systemQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "variance" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "varianceValueMXN" DECIMAL(14,4) NOT NULL DEFAULT 0,

    CONSTRAINT "DailyInventoryOpeningItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyInventoryClosing" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "operationalDate" DATE NOT NULL,
    "status" "DailyClosingStatus" NOT NULL DEFAULT 'PENDING',
    "completedByUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyInventoryClosing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyInventoryClosingItem" (
    "id" TEXT NOT NULL,
    "closingId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "countedQuantity" DECIMAL(14,4) NOT NULL,
    "openingQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "receivedQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "realConsumption" DECIMAL(14,4) NOT NULL DEFAULT 0,

    CONSTRAINT "DailyInventoryClosingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyDeviationReport" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "operationalDate" DATE NOT NULL,
    "status" "DeviationReportStatus" NOT NULL DEFAULT 'PENDING_CLASSIFICATION',
    "totalDeviationValueMXN" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyDeviationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviationItem" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "theoreticalConsumption" DECIMAL(14,4) NOT NULL,
    "realConsumption" DECIMAL(14,4) NOT NULL,
    "deviationQuantity" DECIMAL(14,4) NOT NULL,
    "deviationValueMXN" DECIMAL(14,4) NOT NULL,
    "cause" "DeviationCause",
    "classifiedByUserId" TEXT,
    "note" TEXT,

    CONSTRAINT "DeviationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCashReconciliation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "operationalDate" DATE NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "totalExpected" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "totalCounted" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "difference" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "reconciledByUserId" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyCashReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashDenominationCount" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "denomination" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "CashDenominationCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerminalReconciliation" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "expectedTotal" DECIMAL(14,4) NOT NULL,
    "reportedTotal" DECIMAL(14,4) NOT NULL,
    "reference" TEXT,
    "difference" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "TerminalReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferReconciliation" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "expectedTotal" DECIMAL(14,4) NOT NULL,
    "reportedTotal" DECIMAL(14,4) NOT NULL,
    "folioReferences" TEXT,
    "difference" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "TransferReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyOperationClose" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "operationalDate" DATE NOT NULL,
    "status" "DailyOperationStatus" NOT NULL DEFAULT 'PENDING',
    "signedByUserId" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyOperationClose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FOPValidationItem" (
    "id" TEXT NOT NULL,
    "fopId" TEXT NOT NULL,
    "validationType" "FOPValidationType" NOT NULL,
    "label" TEXT NOT NULL,
    "operatorValue" DECIMAL(14,4) NOT NULL,
    "systemValue" DECIMAL(14,4) NOT NULL,
    "difference" DECIMAL(14,4) NOT NULL,
    "isWithinThreshold" BOOLEAN NOT NULL DEFAULT false,
    "resolution" TEXT,

    CONSTRAINT "FOPValidationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyInventoryOpening_businessId_operationalDate_idx" ON "DailyInventoryOpening"("businessId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyInventoryOpening_businessId_locationId_operationalDate_key" ON "DailyInventoryOpening"("businessId", "locationId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyInventoryOpeningItem_openingId_materialId_key" ON "DailyInventoryOpeningItem"("openingId", "materialId");

-- CreateIndex
CREATE INDEX "DailyInventoryClosing_businessId_operationalDate_idx" ON "DailyInventoryClosing"("businessId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyInventoryClosing_businessId_locationId_operationalDate_key" ON "DailyInventoryClosing"("businessId", "locationId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyInventoryClosingItem_closingId_materialId_key" ON "DailyInventoryClosingItem"("closingId", "materialId");

-- CreateIndex
CREATE INDEX "DailyDeviationReport_businessId_operationalDate_idx" ON "DailyDeviationReport"("businessId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyDeviationReport_businessId_operationalDate_key" ON "DailyDeviationReport"("businessId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "DeviationItem_reportId_materialId_key" ON "DeviationItem"("reportId", "materialId");

-- CreateIndex
CREATE INDEX "DailyCashReconciliation_businessId_operationalDate_idx" ON "DailyCashReconciliation"("businessId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCashReconciliation_businessId_operationalDate_key" ON "DailyCashReconciliation"("businessId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "CashDenominationCount_reconciliationId_denomination_key" ON "CashDenominationCount"("reconciliationId", "denomination");

-- CreateIndex
CREATE UNIQUE INDEX "TerminalReconciliation_reconciliationId_paymentMethodId_key" ON "TerminalReconciliation"("reconciliationId", "paymentMethodId");

-- CreateIndex
CREATE INDEX "DailyOperationClose_businessId_operationalDate_idx" ON "DailyOperationClose"("businessId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyOperationClose_businessId_operationalDate_key" ON "DailyOperationClose"("businessId", "operationalDate");

-- CreateIndex
CREATE INDEX "FOPValidationItem_fopId_idx" ON "FOPValidationItem"("fopId");

-- AddForeignKey
ALTER TABLE "DailyInventoryOpening" ADD CONSTRAINT "DailyInventoryOpening_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyInventoryOpening" ADD CONSTRAINT "DailyInventoryOpening_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyInventoryOpeningItem" ADD CONSTRAINT "DailyInventoryOpeningItem_openingId_fkey" FOREIGN KEY ("openingId") REFERENCES "DailyInventoryOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyInventoryOpeningItem" ADD CONSTRAINT "DailyInventoryOpeningItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyInventoryClosing" ADD CONSTRAINT "DailyInventoryClosing_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyInventoryClosing" ADD CONSTRAINT "DailyInventoryClosing_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyInventoryClosingItem" ADD CONSTRAINT "DailyInventoryClosingItem_closingId_fkey" FOREIGN KEY ("closingId") REFERENCES "DailyInventoryClosing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyInventoryClosingItem" ADD CONSTRAINT "DailyInventoryClosingItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyDeviationReport" ADD CONSTRAINT "DailyDeviationReport_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviationItem" ADD CONSTRAINT "DeviationItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DailyDeviationReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviationItem" ADD CONSTRAINT "DeviationItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCashReconciliation" ADD CONSTRAINT "DailyCashReconciliation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDenominationCount" ADD CONSTRAINT "CashDenominationCount_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "DailyCashReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminalReconciliation" ADD CONSTRAINT "TerminalReconciliation_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "DailyCashReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminalReconciliation" ADD CONSTRAINT "TerminalReconciliation_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferReconciliation" ADD CONSTRAINT "TransferReconciliation_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "DailyCashReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyOperationClose" ADD CONSTRAINT "DailyOperationClose_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FOPValidationItem" ADD CONSTRAINT "FOPValidationItem_fopId_fkey" FOREIGN KEY ("fopId") REFERENCES "DailyOperationClose"("id") ON DELETE CASCADE ON UPDATE CASCADE;
