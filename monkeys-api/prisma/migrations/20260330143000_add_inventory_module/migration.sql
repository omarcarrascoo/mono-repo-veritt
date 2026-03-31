ALTER TABLE "Business"
ADD COLUMN IF NOT EXISTS "defaultCurrency" TEXT NOT NULL DEFAULT 'MXN';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MATERIAL_LOW_STOCK';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MATERIAL_OUT_OF_STOCK';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PRODUCT_LOW_STOCK';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PRODUCT_OUT_OF_STOCK';

CREATE TYPE "InventoryLocationType" AS ENUM ('MAIN', 'WAREHOUSE', 'RESTAURANT', 'KITCHEN', 'OTHER');
CREATE TYPE "InventoryStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "ProductType" AS ENUM ('DIRECT', 'RECIPE');
CREATE TYPE "InventoryMovementType" AS ENUM (
  'OPENING_BALANCE',
  'PURCHASE',
  'RECEIPT',
  'PRODUCTION_IN',
  'PRODUCTION_OUT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'SALE',
  'RETURN',
  'WASTE'
);
CREATE TYPE "InventoryLotSourceType" AS ENUM (
  'OPENING_BALANCE',
  'PURCHASE',
  'RECEIPT',
  'TRANSFER',
  'PRODUCTION',
  'ADJUSTMENT'
);

CREATE TABLE "InventoryLocation" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "InventoryLocationType" NOT NULL DEFAULT 'MAIN',
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "status" "InventoryStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InventoryLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Material" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "baseUnit" TEXT NOT NULL,
  "category" TEXT,
  "sku" TEXT,
  "reorderFrequencyDays" INTEGER,
  "minStock" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "currentStock" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "currentReferenceUnitCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "status" "InventoryStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaterialLot" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "sourceType" "InventoryLotSourceType" NOT NULL,
  "lotCode" TEXT,
  "originalQuantity" DECIMAL(14,4) NOT NULL,
  "remainingQuantity" DECIMAL(14,4) NOT NULL,
  "unitCost" DECIMAL(14,4) NOT NULL,
  "totalCost" DECIMAL(14,4) NOT NULL,
  "currency" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "referenceType" TEXT,
  "referenceId" TEXT,
  "note" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MaterialLot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaterialStockMovement" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "lotId" TEXT,
  "type" "InventoryMovementType" NOT NULL,
  "quantityDelta" DECIMAL(14,4) NOT NULL,
  "balanceAfter" DECIMAL(14,4) NOT NULL,
  "unitCostSnapshot" DECIMAL(14,4),
  "totalCostSnapshot" DECIMAL(14,4),
  "currency" TEXT,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "note" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MaterialStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaterialLotAllocation" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "lotId" TEXT NOT NULL,
  "movementId" TEXT NOT NULL,
  "quantity" DECIMAL(14,4) NOT NULL,
  "unitCostSnapshot" DECIMAL(14,4) NOT NULL,
  "totalCostSnapshot" DECIMAL(14,4) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MaterialLotAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "type" "ProductType" NOT NULL,
  "stockUnit" TEXT NOT NULL DEFAULT 'unit',
  "estimatedDailySalesVolume" DECIMAL(14,4),
  "minStock" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "currentStock" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "currentSalePrice" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "currentMaterialCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "currentDirectLaborCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "currentAllocatedCifCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "currentCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "status" "InventoryStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductSalePriceHistory" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "price" DECIMAL(14,4) NOT NULL,
  "currency" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" TEXT,
  "changeReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductSalePriceHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductManualCostHistory" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "materialCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "directLaborCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "allocatedCifCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "totalCost" DECIMAL(14,4) NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" TEXT,
  "changeReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductManualCostHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductRecipeVersion" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "materialCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "directLaborCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "allocatedCifCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "totalCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductRecipeVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductRecipeVersionItem" (
  "id" TEXT NOT NULL,
  "recipeVersionId" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "quantity" DECIMAL(14,4) NOT NULL,
  "wastePercent" DECIMAL(7,4) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductRecipeVersionItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductLot" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "sourceType" "InventoryLotSourceType" NOT NULL,
  "originalQuantity" DECIMAL(14,4) NOT NULL,
  "remainingQuantity" DECIMAL(14,4) NOT NULL,
  "materialCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "directLaborCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "allocatedCifCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "totalUnitCost" DECIMAL(14,4) NOT NULL,
  "totalLotCost" DECIMAL(14,4) NOT NULL,
  "currency" TEXT NOT NULL,
  "producedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "note" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductLot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductStockMovement" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "lotId" TEXT,
  "type" "InventoryMovementType" NOT NULL,
  "quantityDelta" DECIMAL(14,4) NOT NULL,
  "balanceAfter" DECIMAL(14,4) NOT NULL,
  "materialCostSnapshot" DECIMAL(14,4),
  "directLaborCostSnapshot" DECIMAL(14,4),
  "allocatedCifCostSnapshot" DECIMAL(14,4),
  "totalUnitCostSnapshot" DECIMAL(14,4),
  "totalCostSnapshot" DECIMAL(14,4),
  "currency" TEXT,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "note" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductLotAllocation" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "lotId" TEXT NOT NULL,
  "movementId" TEXT NOT NULL,
  "quantity" DECIMAL(14,4) NOT NULL,
  "materialCostSnapshot" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "directLaborCostSnapshot" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "allocatedCifCostSnapshot" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "totalUnitCostSnapshot" DECIMAL(14,4) NOT NULL,
  "totalCostSnapshot" DECIMAL(14,4) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductLotAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryLocation_businessId_name_key" ON "InventoryLocation"("businessId", "name");
CREATE INDEX "InventoryLocation_businessId_status_createdAt_idx" ON "InventoryLocation"("businessId", "status", "createdAt");

CREATE UNIQUE INDEX "Material_businessId_name_key" ON "Material"("businessId", "name");
CREATE INDEX "Material_businessId_status_createdAt_idx" ON "Material"("businessId", "status", "createdAt");

CREATE INDEX "MaterialLot_businessId_materialId_locationId_receivedAt_idx" ON "MaterialLot"("businessId", "materialId", "locationId", "receivedAt");
CREATE INDEX "MaterialLot_referenceType_referenceId_idx" ON "MaterialLot"("referenceType", "referenceId");

CREATE INDEX "MaterialStockMovement_businessId_materialId_locationId_crea_idx" ON "MaterialStockMovement"("businessId", "materialId", "locationId", "createdAt");
CREATE INDEX "MaterialStockMovement_referenceType_referenceId_idx" ON "MaterialStockMovement"("referenceType", "referenceId");

CREATE UNIQUE INDEX "MaterialLotAllocation_lotId_movementId_key" ON "MaterialLotAllocation"("lotId", "movementId");
CREATE INDEX "MaterialLotAllocation_businessId_materialId_createdAt_idx" ON "MaterialLotAllocation"("businessId", "materialId", "createdAt");

CREATE UNIQUE INDEX "Product_businessId_name_key" ON "Product"("businessId", "name");
CREATE INDEX "Product_businessId_status_createdAt_idx" ON "Product"("businessId", "status", "createdAt");

CREATE INDEX "ProductSalePriceHistory_productId_effectiveFrom_idx" ON "ProductSalePriceHistory"("productId", "effectiveFrom");
CREATE INDEX "ProductManualCostHistory_productId_effectiveFrom_idx" ON "ProductManualCostHistory"("productId", "effectiveFrom");
CREATE UNIQUE INDEX "ProductRecipeVersion_productId_versionNumber_key" ON "ProductRecipeVersion"("productId", "versionNumber");
CREATE INDEX "ProductRecipeVersion_productId_effectiveFrom_idx" ON "ProductRecipeVersion"("productId", "effectiveFrom");
CREATE UNIQUE INDEX "ProductRecipeVersionItem_recipeVersionId_materialId_key" ON "ProductRecipeVersionItem"("recipeVersionId", "materialId");
CREATE INDEX "ProductLot_businessId_productId_locationId_producedAt_idx" ON "ProductLot"("businessId", "productId", "locationId", "producedAt");
CREATE INDEX "ProductLot_referenceType_referenceId_idx" ON "ProductLot"("referenceType", "referenceId");
CREATE INDEX "ProductStockMovement_businessId_productId_locationId_create_idx" ON "ProductStockMovement"("businessId", "productId", "locationId", "createdAt");
CREATE INDEX "ProductStockMovement_referenceType_referenceId_idx" ON "ProductStockMovement"("referenceType", "referenceId");
CREATE UNIQUE INDEX "ProductLotAllocation_lotId_movementId_key" ON "ProductLotAllocation"("lotId", "movementId");
CREATE INDEX "ProductLotAllocation_businessId_productId_createdAt_idx" ON "ProductLotAllocation"("businessId", "productId", "createdAt");

ALTER TABLE "InventoryLocation"
ADD CONSTRAINT "InventoryLocation_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Material"
ADD CONSTRAINT "Material_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MaterialLot"
ADD CONSTRAINT "MaterialLot_materialId_fkey"
FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MaterialLot"
ADD CONSTRAINT "MaterialLot_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MaterialStockMovement"
ADD CONSTRAINT "MaterialStockMovement_materialId_fkey"
FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MaterialStockMovement"
ADD CONSTRAINT "MaterialStockMovement_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MaterialStockMovement"
ADD CONSTRAINT "MaterialStockMovement_lotId_fkey"
FOREIGN KEY ("lotId") REFERENCES "MaterialLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MaterialLotAllocation"
ADD CONSTRAINT "MaterialLotAllocation_materialId_fkey"
FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MaterialLotAllocation"
ADD CONSTRAINT "MaterialLotAllocation_lotId_fkey"
FOREIGN KEY ("lotId") REFERENCES "MaterialLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MaterialLotAllocation"
ADD CONSTRAINT "MaterialLotAllocation_movementId_fkey"
FOREIGN KEY ("movementId") REFERENCES "MaterialStockMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductSalePriceHistory"
ADD CONSTRAINT "ProductSalePriceHistory_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductManualCostHistory"
ADD CONSTRAINT "ProductManualCostHistory_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductRecipeVersion"
ADD CONSTRAINT "ProductRecipeVersion_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductRecipeVersionItem"
ADD CONSTRAINT "ProductRecipeVersionItem_recipeVersionId_fkey"
FOREIGN KEY ("recipeVersionId") REFERENCES "ProductRecipeVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductRecipeVersionItem"
ADD CONSTRAINT "ProductRecipeVersionItem_materialId_fkey"
FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductLot"
ADD CONSTRAINT "ProductLot_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductLot"
ADD CONSTRAINT "ProductLot_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductStockMovement"
ADD CONSTRAINT "ProductStockMovement_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductStockMovement"
ADD CONSTRAINT "ProductStockMovement_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductStockMovement"
ADD CONSTRAINT "ProductStockMovement_lotId_fkey"
FOREIGN KEY ("lotId") REFERENCES "ProductLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductLotAllocation"
ADD CONSTRAINT "ProductLotAllocation_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductLotAllocation"
ADD CONSTRAINT "ProductLotAllocation_lotId_fkey"
FOREIGN KEY ("lotId") REFERENCES "ProductLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductLotAllocation"
ADD CONSTRAINT "ProductLotAllocation_movementId_fkey"
FOREIGN KEY ("movementId") REFERENCES "ProductStockMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
