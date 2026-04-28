-- DropIndex
DROP INDEX "DailyInventoryClosing_businessId_locationId_operationalDate_key";

-- CreateIndex
CREATE INDEX "DailyInventoryClosing_businessId_locationId_operationalDate_idx" ON "DailyInventoryClosing"("businessId", "locationId", "operationalDate");
