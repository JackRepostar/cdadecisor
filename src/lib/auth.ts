import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSessionMemberId } from "@/lib/session";
import type { Member } from "@prisma/client";

export { displayName, initials, isVerifiedBoardMember } from "@/lib/member-format";

// cache() dedup delle letture nello stesso render: molte pagine/layout la chiamano.
export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const memberId = await readSessionMemberId();
  if (!memberId) return null;

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member || member.deletedAt) return null;

  return member;
});

export async function requireMember(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  return member;
}

export async function requireAdmin(): Promise<Member> {
  const member = await requireMember();
  if (member.role !== "ADMIN") redirect("/");
  return member;
}
