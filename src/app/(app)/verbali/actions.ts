"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/auth";

export type SignMinutesState = { status: "idle" } | { status: "error"; message: string };

/**
 * Firma "dimostrativa" del verbale: possibile solo per il Presidente in carica, e
 * solo dopo aver collegato la firma elettronica dal proprio profilo. Predispone il
 * dato (`signedAt`/`signedByMemberId`) che in futuro un provider qualificato reale
 * valorizzerà dopo un'autentica sottoscrizione.
 */
export async function signMinutesAction(
  _prevState: SignMinutesState,
  formData: FormData
): Promise<SignMinutesState> {
  const minutesId = String(formData.get("minutesId") ?? "");
  const member = await requireMember();

  if (!member.isPresident) {
    return { status: "error", message: "Solo il Presidente del Consiglio può firmare il verbale." };
  }
  if (!member.signatureConnectedAt) {
    return {
      status: "error",
      message: "Collega prima la tua firma elettronica dalla pagina Profilo.",
    };
  }

  const minutes = await prisma.minutes.findUnique({ where: { id: minutesId } });
  if (!minutes || minutes.organizationId !== member.organizationId) {
    return { status: "error", message: "Verbale non trovato." };
  }
  if (minutes.signedAt) return { status: "error", message: "Questo verbale è già stato firmato." };

  await prisma.minutes.update({
    where: { id: minutesId },
    data: { signedAt: new Date(), signedByMemberId: member.id },
  });

  revalidatePath(`/verbali/${minutesId}`);
  revalidatePath("/verbali");
  return { status: "idle" };
}
