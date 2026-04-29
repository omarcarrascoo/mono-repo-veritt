-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReceiptStatus" ADD VALUE 'DRAFT';
ALTER TYPE "ReceiptStatus" ADD VALUE 'PENDING_REVIEW';
ALTER TYPE "ReceiptStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "authorizedAt" TIMESTAMP(3),
ADD COLUMN     "authorizedByUserId" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedByUserId" TEXT,
ADD COLUMN     "rejectionReason" TEXT;

-- CreateIndex
CREATE INDEX "Receipt_businessId_status_idx" ON "Receipt"("businessId", "status");

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_authorizedByUserId_fkey" FOREIGN KEY ("authorizedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
