-- CreateEnum
CREATE TYPE "AreaType" AS ENUM ('KITCHEN', 'BAR', 'DINING', 'CASH_REGISTER', 'WAREHOUSE', 'OFFICE', 'PRODUCTION', 'OTHER');

-- CreateEnum
CREATE TYPE "AreaStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProcessExecutionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShiftLogStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShiftBreakType" AS ENUM ('MEAL', 'REST', 'OTHER');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('READ', 'EXECUTE', 'APPROVE', 'MANAGE');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CASH', 'CARD_TERMINAL', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethodStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- AlterTable
ALTER TABLE "InventoryLocation" ADD COLUMN     "areaId" TEXT;

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AreaType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "parentAreaId" TEXT,
    "status" "AreaStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessTemplate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isBlocking" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProcessStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessStep" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stepOrder" INTEGER NOT NULL,
    "requiredRole" "MembershipRole",
    "assignedAreaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessExecution" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "areaId" TEXT,
    "executedByUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "ProcessExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "notesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "areaId" TEXT,
    "clockInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clockOutAt" TIMESTAMP(3),
    "clockInLatitude" DECIMAL(10,7),
    "clockInLongitude" DECIMAL(10,7),
    "clockOutLatitude" DECIMAL(10,7),
    "clockOutLongitude" DECIMAL(10,7),
    "totalMinutes" INTEGER,
    "status" "ShiftLogStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftBreak" (
    "id" TEXT NOT NULL,
    "shiftLogId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "type" "ShiftBreakType" NOT NULL DEFAULT 'REST',
    "minutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftBreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "areaId" TEXT,
    "processId" TEXT,
    "permission" "PermissionAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "terminalReference" TEXT,
    "bankReference" TEXT,
    "status" "PaymentMethodStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "areaId" TEXT,
    "operatorStaffId" TEXT NOT NULL,
    "saleNumber" INTEGER NOT NULL,
    "subtotal" DECIMAL(14,4) NOT NULL,
    "taxAmount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,4) NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'OPEN',
    "cancelledByUserId" TEXT,
    "cancellationReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "totalPrice" DECIMAL(14,4) NOT NULL,
    "costSnapshot" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "recipeVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalePayment" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TheoreticalConsumption" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "recipeVersionId" TEXT NOT NULL,
    "productQuantity" DECIMAL(14,4) NOT NULL,
    "recipeQuantity" DECIMAL(14,4) NOT NULL,
    "wastePercent" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "expectedQuantity" DECIMAL(14,4) NOT NULL,
    "unitCostSnapshot" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "expectedCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TheoreticalConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Area_businessId_status_createdAt_idx" ON "Area"("businessId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Area_businessId_name_key" ON "Area"("businessId", "name");

-- CreateIndex
CREATE INDEX "ProcessTemplate_businessId_status_idx" ON "ProcessTemplate"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessTemplate_businessId_name_key" ON "ProcessTemplate"("businessId", "name");

-- CreateIndex
CREATE INDEX "ProcessStep_processId_idx" ON "ProcessStep"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessStep_processId_stepOrder_key" ON "ProcessStep"("processId", "stepOrder");

-- CreateIndex
CREATE INDEX "ProcessExecution_businessId_processId_startedAt_idx" ON "ProcessExecution"("businessId", "processId", "startedAt");

-- CreateIndex
CREATE INDEX "ProcessExecution_businessId_status_idx" ON "ProcessExecution"("businessId", "status");

-- CreateIndex
CREATE INDEX "ShiftLog_businessId_staffProfileId_clockInAt_idx" ON "ShiftLog"("businessId", "staffProfileId", "clockInAt");

-- CreateIndex
CREATE INDEX "ShiftLog_businessId_clockInAt_idx" ON "ShiftLog"("businessId", "clockInAt");

-- CreateIndex
CREATE INDEX "ShiftBreak_shiftLogId_idx" ON "ShiftBreak"("shiftLogId");

-- CreateIndex
CREATE INDEX "RolePermission_businessId_role_idx" ON "RolePermission"("businessId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_businessId_role_areaId_processId_permission_key" ON "RolePermission"("businessId", "role", "areaId", "processId", "permission");

-- CreateIndex
CREATE INDEX "PaymentMethod_businessId_status_idx" ON "PaymentMethod"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_businessId_name_key" ON "PaymentMethod"("businessId", "name");

-- CreateIndex
CREATE INDEX "Sale_businessId_createdAt_idx" ON "Sale"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Sale_businessId_status_createdAt_idx" ON "Sale"("businessId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Sale_businessId_areaId_createdAt_idx" ON "Sale"("businessId", "areaId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_businessId_saleNumber_key" ON "Sale"("businessId", "saleNumber");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleItem_productId_idx" ON "SaleItem"("productId");

-- CreateIndex
CREATE INDEX "SalePayment_saleId_idx" ON "SalePayment"("saleId");

-- CreateIndex
CREATE INDEX "SalePayment_paymentMethodId_idx" ON "SalePayment"("paymentMethodId");

-- CreateIndex
CREATE INDEX "TheoreticalConsumption_businessId_saleId_idx" ON "TheoreticalConsumption"("businessId", "saleId");

-- CreateIndex
CREATE INDEX "TheoreticalConsumption_businessId_materialId_calculatedAt_idx" ON "TheoreticalConsumption"("businessId", "materialId", "calculatedAt");

-- CreateIndex
CREATE INDEX "TheoreticalConsumption_saleItemId_idx" ON "TheoreticalConsumption"("saleItemId");

-- AddForeignKey
ALTER TABLE "InventoryLocation" ADD CONSTRAINT "InventoryLocation_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_parentAreaId_fkey" FOREIGN KEY ("parentAreaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessTemplate" ADD CONSTRAINT "ProcessTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStep" ADD CONSTRAINT "ProcessStep_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStep" ADD CONSTRAINT "ProcessStep_assignedAreaId_fkey" FOREIGN KEY ("assignedAreaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessExecution" ADD CONSTRAINT "ProcessExecution_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessExecution" ADD CONSTRAINT "ProcessExecution_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftLog" ADD CONSTRAINT "ShiftLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftLog" ADD CONSTRAINT "ShiftLog_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftLog" ADD CONSTRAINT "ShiftLog_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftBreak" ADD CONSTRAINT "ShiftBreak_shiftLogId_fkey" FOREIGN KEY ("shiftLogId") REFERENCES "ShiftLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ProcessTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_operatorStaffId_fkey" FOREIGN KEY ("operatorStaffId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "ProductRecipeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheoreticalConsumption" ADD CONSTRAINT "TheoreticalConsumption_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheoreticalConsumption" ADD CONSTRAINT "TheoreticalConsumption_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheoreticalConsumption" ADD CONSTRAINT "TheoreticalConsumption_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheoreticalConsumption" ADD CONSTRAINT "TheoreticalConsumption_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "ProductRecipeVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
