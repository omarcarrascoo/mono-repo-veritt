-- Migración F1: MembershipRole 5 roles → R1–R6 (V8.0). Ver ROLES_R1_R6_MATRIX.md.
-- Mapeo de datos: OWNER→R6_OWNER, ADMIN→R5_ADMIN, SUPERVISOR→R4_MANAGER,
-- OPERATOR→R3_POS (transición), VERITT_STAFF→VERITT_STAFF.
-- Se usa el patrón seguro de swap de enum: crear tipo nuevo, remapear columnas, borrar viejo.

-- 1. Nuevo enum
CREATE TYPE "MembershipRole_new" AS ENUM (
  'R1_INVENTORY', 'R2_CASH', 'R3_POS', 'R4_MANAGER', 'R5_ADMIN', 'R6_OWNER', 'VERITT_STAFF'
);

-- 2. Remapear cada columna que usa el enum, casteando por el texto mapeado.
--    BusinessMembership.role (NOT NULL)
ALTER TABLE "BusinessMembership"
  ALTER COLUMN "role" TYPE "MembershipRole_new"
  USING (
    CASE "role"::text
      WHEN 'OWNER' THEN 'R6_OWNER'
      WHEN 'ADMIN' THEN 'R5_ADMIN'
      WHEN 'SUPERVISOR' THEN 'R4_MANAGER'
      WHEN 'OPERATOR' THEN 'R3_POS'
      WHEN 'VERITT_STAFF' THEN 'VERITT_STAFF'
    END
  )::"MembershipRole_new";

--    ProcessStep.requiredRole (NULLABLE)
ALTER TABLE "ProcessStep"
  ALTER COLUMN "requiredRole" TYPE "MembershipRole_new"
  USING (
    CASE "requiredRole"::text
      WHEN 'OWNER' THEN 'R6_OWNER'
      WHEN 'ADMIN' THEN 'R5_ADMIN'
      WHEN 'SUPERVISOR' THEN 'R4_MANAGER'
      WHEN 'OPERATOR' THEN 'R3_POS'
      WHEN 'VERITT_STAFF' THEN 'VERITT_STAFF'
      ELSE NULL
    END
  )::"MembershipRole_new";

--    RolePermission.role (NOT NULL)
ALTER TABLE "RolePermission"
  ALTER COLUMN "role" TYPE "MembershipRole_new"
  USING (
    CASE "role"::text
      WHEN 'OWNER' THEN 'R6_OWNER'
      WHEN 'ADMIN' THEN 'R5_ADMIN'
      WHEN 'SUPERVISOR' THEN 'R4_MANAGER'
      WHEN 'OPERATOR' THEN 'R3_POS'
      WHEN 'VERITT_STAFF' THEN 'VERITT_STAFF'
    END
  )::"MembershipRole_new";

-- 3. Swap: borrar el enum viejo y renombrar el nuevo.
DROP TYPE "MembershipRole";
ALTER TYPE "MembershipRole_new" RENAME TO "MembershipRole";
