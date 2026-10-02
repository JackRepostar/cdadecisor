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

// Una richiesta è "nuova" per 24 ore dalla pubblicazione (l'invio del recap dà invece
// per nuove, per costruzione, quelle pubblicate proprio in quell'esecuzione).
const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isNewlyPublished(proposal: { publishedAt: Date | null }, now: Date = new Date()) {
  return proposal.publishedAt !== null && now.getTime() - proposal.publishedAt.getTime() < NEW_WINDOW_MS;
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
