-- CreateTable
CREATE TABLE "MaterialRecipe" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "outputMaterialId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "outputQuantity" DECIMAL(14,4) NOT NULL DEFAULT 1,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "materialCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialRecipeItem" (
    "id" TEXT NOT NULL,
    "materialRecipeId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "wastePercent" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialRecipeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialRecipe_outputMaterialId_versionNumber_key" ON "MaterialRecipe"("outputMaterialId", "versionNumber");

-- CreateIndex
CREATE INDEX "MaterialRecipe_businessId_outputMaterialId_effectiveFrom_idx" ON "MaterialRecipe"("businessId", "outputMaterialId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialRecipeItem_materialRecipeId_materialId_key" ON "MaterialRecipeItem"("materialRecipeId", "materialId");

-- AddForeignKey
ALTER TABLE "MaterialRecipe" ADD CONSTRAINT "MaterialRecipe_outputMaterialId_fkey" FOREIGN KEY ("outputMaterialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRecipeItem" ADD CONSTRAINT "MaterialRecipeItem_materialRecipeId_fkey" FOREIGN KEY ("materialRecipeId") REFERENCES "MaterialRecipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRecipeItem" ADD CONSTRAINT "MaterialRecipeItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
