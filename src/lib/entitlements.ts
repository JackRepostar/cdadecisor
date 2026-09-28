import "server-only";
import { prisma } from "@/lib/prisma";

// Piano gratuito di base: 2 consiglieri e 5 membri dello staff. Oltre questa
// soglia serve un piano a pagamento (non ancora integrato: Stripe è il prossimo
// passo) oppure uno sblocco manuale da parte di Quitebold (AccessGrant).
export const FREE_BOARD_SEATS = 2;
export const FREE_STAFF_SEATS = 5;
export const BOARD_SEAT_PRICE_EUR = 30;

export const GRANT_DURATION_LABELS: Record<string, string> = {
  ONE_MONTH: "1 mese",
  THREE_MONTHS: "3 mesi",
  SIX_MONTHS: "6 mesi",
  TWELVE_MONTHS: "12 mesi",
  LIFETIME: "Lifetime",
};

export function computeGrantExpiry(duration: string, from: Date = new Date()): Date | null {
  const expires = new Date(from);
  switch (duration) {
    case "ONE_MONTH":
      expires.setMonth(expires.getMonth() + 1);
      return expires;
    case "THREE_MONTHS":
      expires.setMonth(expires.getMonth() + 3);
      return expires;
    case "SIX_MONTHS":
      expires.setMonth(expires.getMonth() + 6);
      return expires;
    case "TWELVE_MONTHS":
      expires.setMonth(expires.getMonth() + 12);
      return expires;
    case "LIFETIME":
      return null;
    default:
      throw new Error(`Durata sblocco non valida: ${duration}`);
  }
}

/**
 * Un'organizzazione ha accesso pieno (nessun limite di posti) quando ha almeno
 * uno sblocco manuale attivo e non scaduto. Punto d'innesto naturale per un
 * futuro abbonamento Stripe: basta aggiungere qui "oppure ha un abbonamento
 * attivo con quantità > 0".
 */
export async function getActiveAccessGrant(organizationId: string) {
  const now = new Date();
  return prisma.accessGrant.findFirst({
    where: {
      organizationId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function hasFullAccess(organizationId: string): Promise<boolean> {
  const grant = await getActiveAccessGrant(organizationId);
  return grant !== null;
}

export async function countActiveBoardSeats(organizationId: string) {
  return prisma.member.count({
    where: { organizationId, role: "BOARD", deletedAt: null },
  });
}

export async function countActiveStaffSeats(organizationId: string) {
  return prisma.member.count({
    where: { organizationId, role: "STAFF", deletedAt: null },
  });
}

export type SeatCheck = { allowed: true } | { allowed: false; reason: string };

export async function canAddBoardSeat(organizationId: string): Promise<SeatCheck> {
  if (await hasFullAccess(organizationId)) return { allowed: true };
  const current = await countActiveBoardSeats(organizationId);
  if (current >= FREE_BOARD_SEATS) {
    return {
      allowed: false,
      reason: `Hai raggiunto il limite di ${FREE_BOARD_SEATS} consiglieri del piano gratuito. Oltre questa soglia ogni posto costa €${BOARD_SEAT_PRICE_EUR}/mese: contatta Quitebold per attivare altri posti.`,
    };
  }
  return { allowed: true };
}

export async function canAddStaffSeat(organizationId: string): Promise<SeatCheck> {
  if (await hasFullAccess(organizationId)) return { allowed: true };
  const current = await countActiveStaffSeats(organizationId);
  if (current >= FREE_STAFF_SEATS) {
    return {
      allowed: false,
      reason: `Hai raggiunto il limite di ${FREE_STAFF_SEATS} membri dello staff del piano gratuito. Il limite si sblocca automaticamente con il primo posto CdA a pagamento.`,
    };
  }
  return { allowed: true };
}
