-- DropIndex
DROP INDEX "DailyInventoryOpening_businessId_locationId_operationalDate_key";

-- AlterTable
ALTER TABLE "DailyInventoryOpeningItem" ADD COLUMN     "varianceNote" TEXT;

-- CreateIndex
CREATE INDEX "DailyInventoryOpening_businessId_locationId_operationalDate_idx" ON "DailyInventoryOpening"("businessId", "locationId", "operationalDate");
