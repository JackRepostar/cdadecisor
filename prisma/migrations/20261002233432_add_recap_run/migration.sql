-- CreateTable
CREATE TABLE "RecapRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published" INTEGER NOT NULL DEFAULT 0,
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "RecapRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecapRun_day_idx" ON "RecapRun"("day");

-- CreateIndex
CREATE UNIQUE INDEX "RecapRun_organizationId_day_key" ON "RecapRun"("organizationId", "day");

-- AddForeignKey
ALTER TABLE "RecapRun" ADD CONSTRAINT "RecapRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
