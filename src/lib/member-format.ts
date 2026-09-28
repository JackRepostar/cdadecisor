// Helper puri (nessuna dipendenza server-only): utilizzabili sia da Server Component
// sia da Client Component, a differenza di src/lib/auth.ts.
import type { Member } from "@prisma/client";

export function displayName(member: Pick<Member, "firstName" | "lastName">) {
  return `${member.firstName} ${member.lastName}`;
}

export function initials(member: Pick<Member, "firstName" | "lastName">) {
  return `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase();
}

export function isVerifiedBoardMember(member: Pick<Member, "role" | "status">) {
  return member.role === "BOARD" && member.status === "VERIFIED";
}
