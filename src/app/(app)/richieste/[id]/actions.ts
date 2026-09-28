"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/auth";

export type VoteState = { status: "idle" } | { status: "error"; message: string };

export async function castVoteAction(
  _prevState: VoteState,
  formData: FormData
): Promise<VoteState> {
  const member = await requireMember();
  const proposalId = String(formData.get("proposalId") ?? "");
  const choiceRaw = String(formData.get("choice") ?? "");
  const motivationRaw = String(formData.get("motivation") ?? "").trim();

  if (choiceRaw !== "YES" && choiceRaw !== "NO") {
    return { status: "error", message: "Voto non valido." };
  }
  if (member.role !== "BOARD" || member.status !== "VERIFIED") {
    return { status: "error", message: "Non hai diritto di voto su questa richiesta." };
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { votes: true },
  });
  if (!proposal || proposal.organizationId !== member.organizationId || proposal.status !== "OPEN") {
    return { status: "error", message: "Questa richiesta non è più aperta al voto." };
  }
  if (proposal.votes.some((v) => v.memberId === member.id)) {
    return { status: "error", message: "Hai già votato questa richiesta." };
  }

  const motivation = motivationRaw || (choiceRaw === "YES" ? "Favorevole." : "Contrario.");

  await prisma.vote.create({
    data: { proposalId, memberId: member.id, choice: choiceRaw, motivation },
  });

  const eligibleCount = await prisma.member.count({
    where: { organizationId: member.organizationId, role: "BOARD", status: "VERIFIED", deletedAt: null },
  });
  const votesSoFar = await prisma.vote.count({ where: { proposalId } });

  if (votesSoFar >= eligibleCount) {
    const [yes, no] = await Promise.all([
      prisma.vote.count({ where: { proposalId, choice: "YES" } }),
      prisma.vote.count({ where: { proposalId, choice: "NO" } }),
    ]);
    await prisma.proposal.update({
      where: { id: proposalId },
      data: { status: "CLOSED", outcome: yes > no ? "APPROVED" : "REJECTED", closedAt: new Date() },
    });
  }

  revalidatePath(`/richieste/${proposalId}`);
  revalidatePath("/richieste");
  revalidatePath("/registro");
  return { status: "idle" };
}

export type FeedbackState = { status: "idle" } | { status: "error"; message: string };

export async function castStaffFeedbackAction(
  _prevState: FeedbackState,
  formData: FormData
): Promise<FeedbackState> {
  const member = await requireMember();
  const proposalId = String(formData.get("proposalId") ?? "");
  const prefRaw = String(formData.get("preference") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();

  if (prefRaw !== "POSITIVE" && prefRaw !== "NEGATIVE") {
    return { status: "error", message: "Parere non valido." };
  }
  if (member.role !== "STAFF") {
    return { status: "error", message: "Solo lo staff può lasciare un parere." };
  }

  const assignment = await prisma.staffAssignment.findUnique({
    where: { proposalId_memberId: { proposalId, memberId: member.id } },
    include: { proposal: true },
  });
  if (!assignment || assignment.proposal.organizationId !== member.organizationId) {
    return { status: "error", message: "Non sei stato coinvolto in questa richiesta." };
  }

  const existing = await prisma.staffFeedback.findUnique({
    where: { proposalId_memberId: { proposalId, memberId: member.id } },
  });
  if (existing) {
    return { status: "error", message: "Hai già lasciato un parere su questa richiesta." };
  }

  await prisma.staffFeedback.create({
    data: {
      proposalId,
      memberId: member.id,
      preference: prefRaw,
      comment: comment || (prefRaw === "POSITIVE" ? "Parere positivo." : "Parere negativo."),
    },
  });

  revalidatePath(`/richieste/${proposalId}`);
  revalidatePath("/assegnate");
  return { status: "idle" };
}
