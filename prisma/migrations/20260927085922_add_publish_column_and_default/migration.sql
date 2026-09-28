-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'DRAFT';
