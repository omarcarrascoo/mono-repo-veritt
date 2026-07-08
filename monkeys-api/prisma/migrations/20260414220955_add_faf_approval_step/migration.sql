-- AlterEnum
ALTER TYPE "ReconciliationStatus" ADD VALUE 'PENDING_REVIEW';

-- AlterTable
ALTER TABLE "DailyCashReconciliation" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedByUserId" TEXT;
