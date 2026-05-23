/*
  Warnings:

  - You are about to drop the column `goalId` on the `transactions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "transaction_allocations" DROP CONSTRAINT "transaction_allocations_goalId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_goalId_fkey";

-- DropIndex
DROP INDEX "transactions_goalId_idx";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "goalId";

-- AddForeignKey
ALTER TABLE "transaction_allocations" ADD CONSTRAINT "transaction_allocations_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
