import { PrismaClient } from "@prisma/client";

// Evita di aprire una nuova connessione ad ogni hot-reload in sviluppo.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
