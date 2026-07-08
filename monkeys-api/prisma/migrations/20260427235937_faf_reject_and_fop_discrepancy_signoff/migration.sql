-- AlterEnum
ALTER TYPE "ReconciliationStatus" ADD VALUE 'REJECTED';

-- DropIndex
DROP INDEX "DailyCashReconciliation_businessId_operationalDate_key";

-- AlterTable
ALTER TABLE "DailyCashReconciliation" ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedByUserId" TEXT,
ADD COLUMN     "rejectedReason" TEXT;

-- AlterTable
ALTER TABLE "DailyOperationClose" ADD COLUMN     "discrepancyJustification" TEXT,
ADD COLUMN     "signedWithDiscrepancy" BOOLEAN NOT NULL DEFAULT false;
