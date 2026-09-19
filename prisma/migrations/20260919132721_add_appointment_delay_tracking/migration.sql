-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "delayMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "originalEndAt" TIMESTAMP(3),
ADD COLUMN     "originalStartAt" TIMESTAMP(3);
