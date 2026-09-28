"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export type SettingsFormState = { status: "idle" } | { status: "error"; message: string } | { status: "saved" };

export async function updateCompanySettingsAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const admin = await requireAdmin();

  const companyName = String(formData.get("companyName") ?? "").trim();
  const legalForm = String(formData.get("legalForm") ?? "").trim();
  const registeredOffice = String(formData.get("registeredOffice") ?? "").trim();
  const taxId = String(formData.get("taxId") ?? "").trim();

  if (!companyName || !legalForm || !registeredOffice) {
    return { status: "error", message: "Ragione sociale, forma giuridica e sede legale sono obbligatorie." };
  }

  await prisma.organization.update({
    where: { id: admin.organizationId },
    data: { name: companyName, legalForm, registeredOffice, taxId },
  });

  revalidatePath("/admin/impostazioni");
  return { status: "saved" };
}
