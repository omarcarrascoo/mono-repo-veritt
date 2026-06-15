-- CreateEnum
CREATE TYPE "AMDStatus" AS ENUM ('GENERATED', 'VERIFIED', 'TAMPERED');

-- CreateTable
CREATE TABLE "DailyMasterArchive" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "operationalDate" DATE NOT NULL,
    "fopId" TEXT NOT NULL,
    "contentJson" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AMDStatus" NOT NULL DEFAULT 'GENERATED',

    CONSTRAINT "DailyMasterArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyMasterArchive_fopId_key" ON "DailyMasterArchive"("fopId");

-- CreateIndex
CREATE INDEX "DailyMasterArchive_businessId_operationalDate_idx" ON "DailyMasterArchive"("businessId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMasterArchive_businessId_operationalDate_key" ON "DailyMasterArchive"("businessId", "operationalDate");

-- AddForeignKey
ALTER TABLE "DailyMasterArchive" ADD CONSTRAINT "DailyMasterArchive_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMasterArchive" ADD CONSTRAINT "DailyMasterArchive_fopId_fkey" FOREIGN KEY ("fopId") REFERENCES "DailyOperationClose"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
