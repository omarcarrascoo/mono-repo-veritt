-- Saldo inicial de caja (candado C2): R2 declara el efectivo de apertura antes
-- de la 1ª venta. Uno por negocio y fecha operativa. El FAF parte de este saldo.

-- CreateTable
CREATE TABLE "DailyCashOpening" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "operationalDate" DATE NOT NULL,
    "openingBalance" DECIMAL(14,4) NOT NULL,
    "notes" TEXT,
    "declaredByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyCashOpening_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyCashOpening_businessId_operationalDate_idx" ON "DailyCashOpening"("businessId", "operationalDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCashOpening_businessId_operationalDate_key" ON "DailyCashOpening"("businessId", "operationalDate");

-- AddForeignKey
ALTER TABLE "DailyCashOpening" ADD CONSTRAINT "DailyCashOpening_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
