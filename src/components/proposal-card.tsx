import Link from "next/link";
import { Pill, ProgressBar } from "@/components/ui";
import { displayName } from "@/lib/auth";
import { formatDate, tally, wasSubmittedByAdmin } from "@/lib/proposal-helpers";
import type { Member, Proposal, Vote, Attachment, StaffAssignment } from "@prisma/client";

type ProposalWithRelations = Proposal & {
  author: Member;
  votes: Vote[];
  attachments: Attachment[];
  staffAssignments: StaffAssignment[];
};

export function ProposalCard({
  proposal,
  myVote,
  isNew = false,
}: {
  proposal: ProposalWithRelations;
  myVote?: Vote;
  isNew?: boolean;
}) {
  const t = tally(proposal.votes);

  return (
    <Link href={`/richieste/${proposal.id}`} className="block">
      <div className="rounded-2xl border border-line bg-paper-raised p-4 transition-colors hover:border-navy-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 font-display text-[17px] font-semibold">{proposal.title}</div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
              <span>
                Proposta da {displayName(proposal.author)} · {formatDate(proposal.createdAt)}
              </span>
              {proposal.attachments.length > 0 && (
                <span className="rounded-full border border-line bg-paper px-2 py-0.5">
                  📎 {proposal.attachments.length}
                </span>
              )}
              {proposal.staffAssignments.length > 0 && (
                <span className="rounded-full border border-line bg-paper px-2 py-0.5">
                  👥 {proposal.staffAssignments.length}
                </span>
              )}
              {wasSubmittedByAdmin(proposal) && (
                <span className="italic">inserita dall&apos;amministratore</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {isNew && <Pill tone="new">Nuova</Pill>}
            <Pill tone="pending">In votazione</Pill>
          </div>
        </div>
        <p className="mt-2.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-soft">
          {proposal.description}
        </p>
        <div className="mt-3 flex items-center gap-2.5">
          <ProgressBar yes={t.yes} no={t.no} />
          <span className="whitespace-nowrap font-mono text-xs text-ink-soft">
            {t.yes} sì · {t.no} no
          </span>
        </div>
        {myVote && (
          <div
            className={`mt-2 text-[11px] font-bold ${myVote.choice === "YES" ? "text-good" : "text-bad"}`}
          >
            {myVote.choice === "YES" ? "✓ Hai votato a favore" : "✕ Hai votato contro"}
          </div>
        )}
      </div>
    </Link>
  );
}
