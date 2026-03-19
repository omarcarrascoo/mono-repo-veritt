/*
  Warnings:

  - You are about to drop the column `suggestedUsername` on the `StaffProfile` table. All the data in the column will be lost.
  - The `systemAccessLevel` column on the `StaffProfile` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[userId]` on the table `StaffProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[businessId,username]` on the table `StaffProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PayrollFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "SystemAccessLevel" AS ENUM ('NONE', 'OPERATOR', 'SUPERVISOR', 'ADMIN');

-- AlterTable
ALTER TABLE "StaffProfile" DROP COLUMN "suggestedUsername",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "username" TEXT,
DROP COLUMN "systemAccessLevel",
ADD COLUMN     "systemAccessLevel" "SystemAccessLevel" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "StaffCompensation" (
    "id" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "salaryAmount" DECIMAL(10,2) NOT NULL,
    "salaryCurrency" TEXT NOT NULL DEFAULT 'MXN',
    "payrollFrequency" "PayrollFrequency" NOT NULL,
    "weeklyPayDay" INTEGER,
    "monthlyPayDay" INTEGER,
    "semimonthlyFirstDay" INTEGER,
    "semimonthlySecondDay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffCompensation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffCompensation_staffProfileId_key" ON "StaffCompensation"("staffProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_businessId_username_key" ON "StaffProfile"("businessId", "username");

-- AddForeignKey
ALTER TABLE "StaffCompensation" ADD CONSTRAINT "StaffCompensation_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
