"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { canAddBoardSeat, canAddStaffSeat } from "@/lib/entitlements";
import { Prisma } from "@prisma/client";

export type MemberFormState = { status: "idle" } | { status: "error"; message: string };

function isUniqueEmailError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function addMemberAction(
  _prevState: MemberFormState,
  formData: FormData
): Promise<MemberFormState> {
  const admin = await requireAdmin();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const kind = String(formData.get("kind") ?? "BOARD");

  if (!firstName || !lastName || !email) {
    return { status: "error", message: "Inserisci nome, cognome ed email." };
  }
  if (kind !== "BOARD" && kind !== "STAFF") {
    return { status: "error", message: "Tipo di account non valido." };
  }

  const seatCheck = kind === "BOARD" ? await canAddBoardSeat(admin.organizationId) : await canAddStaffSeat(admin.organizationId);
  if (!seatCheck.allowed) {
    return { status: "error", message: seatCheck.reason };
  }

  const palette = ["#B8912F", "#1B2A41", "#5B7C99", "#7D6B57", "#8A5A44", "#4E6E58", "#8E5E8B", "#3E7C8C"];
  const count = await prisma.member.count({ where: { organizationId: admin.organizationId } });

  try {
    await prisma.member.create({
      data: {
        organizationId: admin.organizationId,
        firstName,
        lastName,
        email,
        jobTitle: jobTitle || (kind === "STAFF" ? "Staff" : "Consigliere"),
        role: kind,
        status: kind === "BOARD" ? "PENDING" : "VERIFIED",
        color: palette[count % palette.length],
      },
    });
  } catch (error) {
    if (isUniqueEmailError(error)) {
      return { status: "error", message: "Esiste già un membro con questa email." };
    }
    throw error;
  }

  revalidatePath("/admin/membri");
  return { status: "idle" };
}

export async function updateMemberAction(
  _prevState: MemberFormState,
  formData: FormData
): Promise<MemberFormState> {
  const admin = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const kind = String(formData.get("kind") ?? "BOARD");

  if (!id || !firstName || !lastName || !email) {
    return { status: "error", message: "Compila nome, cognome ed email." };
  }
  if (kind !== "BOARD" && kind !== "STAFF") {
    return { status: "error", message: "Tipo di account non valido." };
  }

  const current = await prisma.member.findUnique({ where: { id } });
  if (!current || current.organizationId !== admin.organizationId) {
    return { status: "error", message: "Membro non trovato." };
  }

  const becameBoard = kind === "BOARD" && current.role !== "BOARD";
  if (becameBoard) {
    const seatCheck = await canAddBoardSeat(admin.organizationId);
    if (!seatCheck.allowed) return { status: "error", message: seatCheck.reason };
  }
  // Se non è più un membro del CdA non può restare Presidente né avere una firma collegata.
  const leftBoard = kind !== "BOARD" && current.isPresident;

  try {
    await prisma.member.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        jobTitle: jobTitle || (kind === "STAFF" ? "Staff" : "Consigliere"),
        role: kind,
        status: becameBoard ? "PENDING" : current.status,
        ...(leftBoard
          ? { isPresident: false, signatureProvider: null, signatureConnectedAt: null }
          : {}),
      },
    });
  } catch (error) {
    if (isUniqueEmailError(error)) {
      return { status: "error", message: "Esiste già un membro con questa email." };
    }
    throw error;
  }

  revalidatePath("/admin/membri");
  return { status: "idle" };
}

export async function verifyMemberAction(memberId: string) {
  const admin = await requireAdmin();
  await prisma.member.updateMany({
    where: { id: memberId, organizationId: admin.organizationId },
    data: { status: "VERIFIED" },
  });
  revalidatePath("/admin/membri");
}

export async function rejectMemberAction(memberId: string) {
  const admin = await requireAdmin();
  await prisma.member.updateMany({
    where: { id: memberId, organizationId: admin.organizationId },
    data: { status: "REJECTED" },
  });
  revalidatePath("/admin/membri");
}

export async function deleteMemberAction(memberId: string) {
  const admin = await requireAdmin();
  await prisma.member.updateMany({
    where: { id: memberId, organizationId: admin.organizationId },
    data: {
      deletedAt: new Date(),
      isPresident: false,
      signatureProvider: null,
      signatureConnectedAt: null,
    },
  });
  revalidatePath("/admin/membri");
}

/**
 * Imposta un membro del CdA come Presidente, revocando il titolo a chi lo aveva
 * (un solo Presidente alla volta, per organizzazione). Solo il Presidente può poi
 * collegare la firma elettronica e firmare i verbali.
 */
export async function setPresidentAction(memberId: string) {
  const admin = await requireAdmin();

  const target = await prisma.member.findUnique({ where: { id: memberId } });
  if (!target || target.organizationId !== admin.organizationId || target.role !== "BOARD" || target.deletedAt) {
    throw new Error("Solo un membro attivo del CdA può essere designato Presidente.");
  }

  await prisma.$transaction([
    prisma.member.updateMany({
      where: { organizationId: admin.organizationId, isPresident: true, id: { not: memberId } },
      data: { isPresident: false, signatureProvider: null, signatureConnectedAt: null },
    }),
    prisma.member.update({ where: { id: memberId }, data: { isPresident: true } }),
  ]);

  revalidatePath("/admin/membri");
}
