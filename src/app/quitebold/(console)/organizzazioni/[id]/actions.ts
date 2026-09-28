"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { computeGrantExpiry } from "@/lib/entitlements";

export type GrantFormState = { status: "idle" } | { status: "error"; message: string };

const VALID_DURATIONS = ["ONE_MONTH", "THREE_MONTHS", "SIX_MONTHS", "TWELVE_MONTHS", "LIFETIME"];

export async function grantAccessAction(
  _prevState: GrantFormState,
  formData: FormData
): Promise<GrantFormState> {
  const admin = await requirePlatformAdmin();

  const organizationId = String(formData.get("organizationId") ?? "");
  const duration = String(formData.get("duration") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId) return { status: "error", message: "Organizzazione non valida." };
  if (!VALID_DURATIONS.includes(duration)) {
    return { status: "error", message: "Seleziona una durata valida." };
  }

  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) return { status: "error", message: "Organizzazione non trovata." };

  const expiresAt = computeGrantExpiry(duration);

  await prisma.accessGrant.create({
    data: {
      organizationId,
      grantedById: admin.id,
      duration: duration as never,
      expiresAt,
      note: note || null,
    },
  });

  revalidatePath(`/quitebold/organizzazioni/${organizationId}`);
  revalidatePath("/quitebold/organizzazioni");
  return { status: "idle" };
}

export async function revokeAccessGrantAction(grantId: string) {
  await requirePlatformAdmin();
  const grant = await prisma.accessGrant.findUnique({ where: { id: grantId } });
  if (!grant) return;

  await prisma.accessGrant.update({
    where: { id: grantId },
    data: { revokedAt: new Date() },
  });

  revalidatePath(`/quitebold/organizzazioni/${grant.organizationId}`);
  revalidatePath("/quitebold/organizzazioni");
}
