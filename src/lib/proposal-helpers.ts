import type { Vote } from "@prisma/client";

export function tally(votes: Pick<Vote, "choice">[]) {
  const yes = votes.filter((v) => v.choice === "YES").length;
  const no = votes.filter((v) => v.choice === "NO").length;
  return { yes, no, total: yes + no };
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function humanFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function wasSubmittedByAdmin(proposal: { authorId: string; createdById: string }) {
  return proposal.authorId !== proposal.createdById;
}
