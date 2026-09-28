import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember, displayName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, tally } from "@/lib/proposal-helpers";
import { Pill, ProgressBar, GhostButton } from "@/components/ui";
import { AttachmentsBlock } from "@/components/attachments-block";
import { VoteForm } from "./vote-form";
import { StaffFeedbackForm } from "./staff-feedback-form";

export default async function RichiestaDetailPage({ params }: PageProps<"/richieste/[id]">) {
  const { id } = await params;
  const member = await requireMember();

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      author: true,
      attachments: true,
      votes: { include: { member: true } },
      staffAssignments: { include: { member: true } },
      staffFeedback: { include: { member: true } },
    },
  });
  if (!proposal || proposal.status === "DRAFT" || proposal.organizationId !== member.organizationId) {
    notFound();
  }

  const statusPill =
    proposal.status === "OPEN" ? (
      <Pill tone="pending">In votazione</Pill>
    ) : proposal.outcome === "APPROVED" ? (
      <Pill tone="approved">Approvata</Pill>
    ) : (
      <Pill tone="rejected">Respinta</Pill>
    );

  const header = (
    <div>
      <div className="mb-1.5 text-xs text-ink-soft">
        Proposta da {displayName(proposal.author)} · {formatDate(proposal.createdAt)}
        {proposal.authorId !== proposal.createdById && (
          <span className="italic"> · inserita dall&apos;amministratore</span>
        )}
      </div>
      <h1 className="font-display text-[22px] font-semibold">{proposal.title}</h1>
      <div className="mt-2">{statusPill}</div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
        {proposal.description}
      </p>
    </div>
  );

  if (member.role === "STAFF") {
    const assignment = proposal.staffAssignments.find((a) => a.memberId === member.id);
    return (
      <div className="space-y-5 pb-10">
        <Link href="/assegnate" className="text-[12.5px] font-semibold text-navy-soft">
          ← Richieste assegnate
        </Link>
        {header}
        {!assignment ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-soft">
            Non sei stato coinvolto in questa richiesta.
          </div>
        ) : (
          <>
            <AttachmentsBlock attachments={proposal.attachments} />
            <div className="rounded-2xl border border-line bg-paper-raised p-4">
              <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-ink-soft">
                Il tuo parere
              </h3>
              {(() => {
                const fb = proposal.staffFeedback.find((f) => f.memberId === member.id);
                if (!fb) return <StaffFeedbackForm proposalId={proposal.id} />;
                return (
                  <div className="rounded-lg bg-pending-bg px-3 py-2.5 text-sm text-ink">
                    Il tuo parere:{" "}
                    <b>{fb.preference === "POSITIVE" ? "positivo" : "negativo"}</b> — &quot;
                    {fb.comment}&quot;
                    <p className="mt-1.5 text-[12px] text-ink-soft">
                      Il tuo parere è consultivo e non viene conteggiato tra i voti del
                      Consiglio.
                    </p>
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </div>
    );
  }

  // BOARD o ADMIN
  const t = tally(proposal.votes);
  const eligibleMembers = await prisma.member.findMany({
    where: { organizationId: member.organizationId, role: "BOARD", status: "VERIFIED", deletedAt: null },
  });
  const voteByMemberId = new Map(proposal.votes.map((v) => [v.memberId, v]));
  const voterIds = Array.from(
    new Set([...eligibleMembers.map((m) => m.id), ...proposal.votes.map((v) => v.memberId)])
  );
  const eligibleById = new Map(eligibleMembers.map((m) => [m.id, m]));

  const myVote = voteByMemberId.get(member.id);

  return (
    <div className="space-y-5 pb-10">
      <Link href="/richieste" className="text-[12.5px] font-semibold text-navy-soft">
        ← Richieste aperte
      </Link>
      {header}

      {member.role === "ADMIN" && (
        <Link href={`/richieste/${proposal.id}/email`}>
          <GhostButton type="button">✉️ Vedi l&apos;email inviata ai consiglieri</GhostButton>
        </Link>
      )}

      <AttachmentsBlock attachments={proposal.attachments} />

      <div>
        <h3 className="mb-2.5 text-[12px] font-bold uppercase tracking-wide text-ink-soft">
          Esito attuale
        </h3>
        <ProgressBar yes={t.yes} no={t.no} />
        <div className="mt-1.5 font-mono text-xs text-ink-soft">
          {t.yes} favorevoli · {t.no} contrari ·{" "}
          {Math.max(0, eligibleMembers.length - t.total)} in attesa
        </div>
      </div>

      <div>
        <h3 className="mb-2.5 text-[12px] font-bold uppercase tracking-wide text-ink-soft">
          Voti dei consiglieri
        </h3>
        <div className="divide-y divide-line">
          {voterIds.map((mid) => {
            const vote = voteByMemberId.get(mid);
            const m = eligibleById.get(mid) ?? vote?.member;
            if (!m) return null;
            return (
              <div key={mid} className="flex items-start gap-2.5 py-2 text-[13px]">
                <span
                  className={`mt-0.5 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[11px] font-extrabold text-white ${
                    !vote ? "bg-ink-soft" : vote.choice === "YES" ? "bg-good" : "bg-bad"
                  }`}
                >
                  {!vote ? "·" : vote.choice === "YES" ? "✓" : "✕"}
                </span>
                <div>
                  <b className="block">{displayName(m)}</b>
                  <span className="text-ink-soft">
                    {vote ? vote.motivation || "—" : "In attesa di voto"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {proposal.staffAssignments.length > 0 && (
        <div>
          <h3 className="mb-2.5 text-[12px] font-bold uppercase tracking-wide text-ink-soft">
            Pareri dello staff coinvolto{" "}
            <span className="font-normal normal-case tracking-normal">(non vincolanti)</span>
          </h3>
          <div className="divide-y divide-line">
            {proposal.staffAssignments.map((a) => {
              const fb = proposal.staffFeedback.find((f) => f.memberId === a.memberId);
              return (
                <div key={a.id} className="flex items-start gap-2.5 py-2 text-[13px]">
                  <span
                    className={`mt-0.5 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[11px] font-extrabold text-white ${
                      !fb ? "bg-ink-soft" : fb.preference === "POSITIVE" ? "bg-good" : "bg-bad"
                    }`}
                  >
                    {!fb ? "·" : fb.preference === "POSITIVE" ? "👍" : "👎"}
                  </span>
                  <div>
                    <b className="block">{displayName(a.member)}</b>
                    <span className="text-ink-soft">
                      {fb ? fb.comment : "Parere non ancora espresso"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {proposal.status === "OPEN" && (
        <div>
          {member.role === "ADMIN" ? (
            <div className="rounded-lg bg-pending-bg px-3 py-2.5 text-sm text-ink">
              Accesso amministratore: senza diritto di voto in Consiglio.
            </div>
          ) : member.status !== "VERIFIED" ? (
            <div className="rounded-lg bg-bad-bg px-3 py-2.5 text-sm text-bad">
              Il tuo account è in attesa di validazione dell&apos;amministratore. Non puoi
              votare finché la tua email aziendale non è confermata.
            </div>
          ) : myVote ? (
            <div className="rounded-lg bg-pending-bg px-3 py-2.5 text-sm text-ink">
              Hai votato: <b>{myVote.choice === "YES" ? "a favore" : "contro"}</b> — &quot;
              {myVote.motivation}&quot;
            </div>
          ) : (
            <VoteForm proposalId={proposal.id} />
          )}
        </div>
      )}
    </div>
  );
}
