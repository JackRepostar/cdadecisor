-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "isPresident" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "signatureConnectedAt" TIMESTAMP(3),
ADD COLUMN     "signatureProvider" TEXT;

-- CreateTable
CREATE TABLE "Minutes" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshot" JSONB NOT NULL,
    "signedAt" TIMESTAMP(3),
    "signedByMemberId" TEXT,

    CONSTRAINT "Minutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinutesNotification" (
    "id" TEXT NOT NULL,
    "minutesId" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "toName" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinutesNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Minutes_periodEnd_idx" ON "Minutes"("periodEnd");

-- CreateIndex
CREATE INDEX "MinutesNotification_minutesId_idx" ON "MinutesNotification"("minutesId");

-- AddForeignKey
ALTER TABLE "Minutes" ADD CONSTRAINT "Minutes_signedByMemberId_fkey" FOREIGN KEY ("signedByMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinutesNotification" ADD CONSTRAINT "MinutesNotification_minutesId_fkey" FOREIGN KEY ("minutesId") REFERENCES "Minutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
