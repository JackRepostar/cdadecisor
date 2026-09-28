import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember, displayName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/proposal-helpers";
import { Pill, EmptyState } from "@/components/ui";

export default async function RichiesteAssegnatePage() {
  const member = await requireMember();
  if (member.role !== "STAFF") redirect("/");

  const assignments = await prisma.staffAssignment.findMany({
    where: { memberId: member.id },
    include: {
      proposal: {
        include: { author: true, staffFeedback: { where: { memberId: member.id } } },
      },
    },
    orderBy: { proposal: { createdAt: "desc" } },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[22px] font-semibold">Richieste assegnate</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          Le proposte del Consiglio in cui sei stato coinvolto per un parere consultivo.
        </p>
      </div>

      {assignments.length === 0 ? (
        <EmptyState>Non sei stato coinvolto in nessuna richiesta al momento.</EmptyState>
      ) : (
        <div className="space-y-3">
          {assignments.map(({ proposal }) => {
            const fb = proposal.staffFeedback[0];
            return (
              <Link key={proposal.id} href={`/richieste/${proposal.id}`} className="block">
                <div className="rounded-2xl border border-line bg-paper-raised p-4 hover:border-navy-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 font-display text-[17px] font-semibold">
                        {proposal.title}
                      </div>
                      <div className="text-xs text-ink-soft">
                        Proposta da {displayName(proposal.author)} · {formatDate(proposal.createdAt)}
                      </div>
                    </div>
                    {proposal.status === "OPEN" ? (
                      <Pill tone="pending">In votazione</Pill>
                    ) : proposal.outcome === "APPROVED" ? (
                      <Pill tone="approved">Approvata</Pill>
                    ) : (
                      <Pill tone="rejected">Respinta</Pill>
                    )}
                  </div>
                  <p className="mt-2.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-soft">
                    {proposal.description}
                  </p>
                  {fb ? (
                    <div
                      className={`mt-2 text-[11px] font-bold ${fb.preference === "POSITIVE" ? "text-good" : "text-bad"}`}
                    >
                      {fb.preference === "POSITIVE"
                        ? "👍 Hai espresso parere positivo"
                        : "👎 Hai espresso parere negativo"}
                    </div>
                  ) : (
                    <div className="mt-2 inline-block">
                      <Pill tone="pending">Il tuo parere è in attesa</Pill>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
