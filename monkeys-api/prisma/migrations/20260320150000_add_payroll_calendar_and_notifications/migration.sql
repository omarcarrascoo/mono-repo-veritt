-- CreateEnum
CREATE TYPE "PayrollPaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'SKIPPED', 'CANCELED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PAYROLL_DUE', 'PAYROLL_OVERDUE');

-- AlterTable
ALTER TABLE "StaffCompensation"
ADD COLUMN "firstPaymentDate" DATE;

-- Backfill existing rows with their creation day to keep legacy records valid.
UPDATE "StaffCompensation"
SET "firstPaymentDate" = DATE("createdAt")
WHERE "firstPaymentDate" IS NULL;

-- AlterTable
ALTER TABLE "StaffCompensation"
ALTER COLUMN "firstPaymentDate" SET NOT NULL;

-- CreateTable
CREATE TABLE "StaffCompensationHistory" (
    "id" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "salaryAmount" DECIMAL(10,2) NOT NULL,
    "salaryCurrency" TEXT NOT NULL DEFAULT 'MXN',
    "payrollFrequency" "PayrollFrequency" NOT NULL,
    "firstPaymentDate" DATE NOT NULL,
    "weeklyPayDay" INTEGER,
    "monthlyPayDay" INTEGER,
    "semimonthlyFirstDay" INTEGER,
    "semimonthlySecondDay" INTEGER,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffCompensationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPayment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "payrollFrequency" "PayrollFrequency" NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "PayrollPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paidByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "dedupeKey" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "scheduledFor" DATE,
    "readAt" TIMESTAMP(3),
    "readByUserId" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffCompensationHistory_staffProfileId_effectiveFrom_idx" ON "StaffCompensationHistory"("staffProfileId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPayment_staffProfileId_dueDate_key" ON "PayrollPayment"("staffProfileId", "dueDate");

-- CreateIndex
CREATE INDEX "PayrollPayment_businessId_dueDate_status_idx" ON "PayrollPayment"("businessId", "dueDate", "status");

-- CreateIndex
CREATE INDEX "PayrollPayment_staffProfileId_dueDate_idx" ON "PayrollPayment"("staffProfileId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_businessId_status_createdAt_idx" ON "Notification"("businessId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_resourceType_resourceId_idx" ON "Notification"("resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "StaffCompensationHistory" ADD CONSTRAINT "StaffCompensationHistory_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPayment" ADD CONSTRAINT "PayrollPayment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPayment" ADD CONSTRAINT "PayrollPayment_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
