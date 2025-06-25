/*
  Warnings:

  - You are about to alter the column `total` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - Made the column `platform` on table `Order` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "token" TEXT,
ALTER COLUMN "total" SET DATA TYPE INTEGER,
ALTER COLUMN "platform" SET NOT NULL,
ALTER COLUMN "status" DROP DEFAULT;
