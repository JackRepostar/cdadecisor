"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/auth";
import { saveAttachmentFile, AttachmentValidationError } from "@/lib/attachments";

export type NewProposalState =
  | { status: "idle" }
  | { status: "error"; message: string };

export async function createProposalAction(
  _prevState: NewProposalState,
  formData: FormData
): Promise<NewProposalState> {
  const member = await requireMember();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title || !description) {
    return { status: "error", message: "Compila oggetto e dettaglio prima di inviare." };
  }

  let authorId = member.id;
  if (member.role === "ADMIN") {
    const chosen = String(formData.get("authorId") ?? "");
    const author = await prisma.member.findFirst({
      where: {
        id: chosen,
        organizationId: member.organizationId,
        role: "BOARD",
        status: "VERIFIED",
        deletedAt: null,
      },
    });
    if (!author) {
      return {
        status: "error",
        message: "Seleziona il membro del CdA per cui creare la richiesta.",
      };
    }
    authorId = author.id;
  } else if (member.role === "STAFF") {
    return { status: "error", message: "Lo staff non può sottoporre richieste." };
  } else if (member.status !== "VERIFIED") {
    return {
      status: "error",
      message: "Il tuo account è in attesa di validazione: non puoi ancora sottoporre richieste.",
    };
  }

  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  const staffIds = formData.getAll("staffIds").map(String);
  const validStaff = staffIds.length
    ? await prisma.member.findMany({
        where: {
          id: { in: staffIds },
          organizationId: member.organizationId,
          role: "STAFF",
          deletedAt: null,
        },
        select: { id: true },
      })
    : [];

  const savedAttachments: Awaited<ReturnType<typeof saveAttachmentFile>>[] = [];
  try {
    for (const file of files) {
      savedAttachments.push(await saveAttachmentFile(file));
    }
  } catch (error) {
    if (error instanceof AttachmentValidationError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  await prisma.proposal.create({
    data: {
      organizationId: member.organizationId,
      title,
      description,
      authorId,
      createdById: member.id,
      // Pubblicata subito, in tempo reale: è visibile al Consiglio appena creata.
      // L'email di recap (giorni lavorativi alle 15:00) resta un canale a parte.
      status: "OPEN",
      publishedAt: new Date(),
      attachments: {
        create: savedAttachments.map((a) => ({
          filename: a.filename,
          mimeType: a.mimeType,
          size: a.size,
          storageKey: a.storageKey,
        })),
      },
      staffAssignments: {
        create: validStaff.map((s) => ({ memberId: s.id })),
      },
    },
  });

  revalidatePath("/richieste");
  revalidatePath("/registro");
  redirect(member.role === "ADMIN" ? "/registro?inviata=1" : "/richieste?inviata=1");
}
