-- CreateEnum
CREATE TYPE "MaterialKind" AS ENUM ('RAW', 'TRANSFORMED');

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "kind" "MaterialKind" NOT NULL DEFAULT 'RAW';
