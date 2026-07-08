-- AlterEnum
ALTER TYPE "SupplierInvoiceStatus" ADD VALUE 'DELETED';

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "cancellationComment" TEXT,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledByUserId" TEXT;

-- AlterTable
ALTER TABLE "SupplierInvoice" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedByUserId" TEXT,
ADD COLUMN     "deletionReason" TEXT,
ADD COLUMN     "discrepancyNote" TEXT,
ADD COLUMN     "receiptTotal" DECIMAL(14,4),
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
