"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/auth";

/**
 * Simula il collegamento a un provider di firma elettronica qualificata.
 * Nessun provider reale è ancora integrato: questa azione predispone solo il dato
 * (`signatureConnectedAt`) che in futuro verrà impostato al termine di un vero
 * flusso OAuth/identificazione verso un Qualified Trust Service Provider.
 */
export async function connectSignatureAction() {
  const member = await requireMember();
  if (!member.isPresident) {
    throw new Error("Solo il Presidente del Consiglio può collegare la firma elettronica.");
  }

  await prisma.member.update({
    where: { id: member.id },
    data: { signatureProvider: "demo", signatureConnectedAt: new Date() },
  });

  revalidatePath("/profilo");
}

export async function disconnectSignatureAction() {
  const member = await requireMember();
  if (!member.isPresident) {
    throw new Error("Solo il Presidente del Consiglio può gestire la firma elettronica.");
  }

  await prisma.member.update({
    where: { id: member.id },
    data: { signatureProvider: null, signatureConnectedAt: null },
  });

  revalidatePath("/profilo");
}
