-- Permisos configurables por negocio: override de capacidades por rol.
-- Sin filas para un rol → se usa el default en código (capabilities.ts).

-- CreateTable
CREATE TABLE "BusinessRoleCapability" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "capability" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessRoleCapability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessRoleCapability_businessId_role_idx" ON "BusinessRoleCapability"("businessId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessRoleCapability_businessId_role_capability_key" ON "BusinessRoleCapability"("businessId", "role", "capability");

-- AddForeignKey
ALTER TABLE "BusinessRoleCapability" ADD CONSTRAINT "BusinessRoleCapability_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
