import type { Vote } from "@prisma/client";
import { APP_TIMEZONE } from "@/lib/app-timezone";

export function tally(votes: Pick<Vote, "choice">[]) {
  const yes = votes.filter((v) => v.choice === "YES").length;
  const no = votes.filter((v) => v.choice === "NO").length;
  return { yes, no, total: yes + no };
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: APP_TIMEZONE,
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

// Una richiesta è "nuova" se è stata pubblicata dopo l'istante `since` (vedi
// getNewSince in recap-window.ts): cioè finché non è stata segnalata via email e fino
// al recap successivo, così l'app e l'email indicano sempre le stesse richieste.
export function isNewSince(proposal: { publishedAt: Date | null; createdAt: Date }, since: Date) {
  return (proposal.publishedAt ?? proposal.createdAt).getTime() > since.getTime();
}

/**
 * Ordine con cui l'utente vede le richieste, sia nell'app sia nell'email: prima le
 * nuove; poi quelle su cui deve ancora agire (voto o parere) prima delle altre; a
 * parità la più recente prima. Non modifica l'array ricevuto.
 */
export function orderForMember<T extends { publishedAt: Date | null; createdAt: Date }>(
  items: T[],
  options: { isNew: (item: T) => boolean; needsAction?: (item: T) => boolean }
) {
  const when = (item: T) => (item.publishedAt ?? item.createdAt).getTime();
  return [...items].sort(
    (a, b) =>
      Number(options.isNew(b)) - Number(options.isNew(a)) ||
      Number(options.needsAction?.(b) ?? false) - Number(options.needsAction?.(a) ?? false) ||
      when(b) - when(a) ||
      b.createdAt.getTime() - a.createdAt.getTime()
  );
}
