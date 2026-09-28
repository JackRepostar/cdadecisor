-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "companyName" TEXT NOT NULL DEFAULT 'Nome Azienda S.p.A.',
    "legalForm" TEXT NOT NULL DEFAULT 'Società per Azioni',
    "registeredOffice" TEXT NOT NULL DEFAULT 'Via da definire n. 0, 00000 Città (XX)',
    "taxId" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);
