import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { describeNextPublish } from "@/lib/publish";
import { ProposalCard } from "@/components/proposal-card";
import { EmptyState, Callout } from "@/components/ui";

export default async function RichiesteAperteBoardPage({ searchParams }: PageProps<"/richieste">) {
  const member = await requireMember();
  if (member.role === "ADMIN") redirect("/registro");
  if (member.role === "STAFF") redirect("/assegnate");

  const params = await searchParams;
  const justCreated = params.inviata === "1";

  const proposals = await prisma.proposal.findMany({
    where: { organizationId: member.organizationId, status: "OPEN" },
    include: { author: true, votes: true, attachments: true, staffAssignments: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[22px] font-semibold">Richieste aperte</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          Proposte sottoposte al Consiglio, in attesa dell&apos;esito.
        </p>
      </div>

      {justCreated && (
        <Callout tone="gold" title="Richiesta registrata">
          Sarà resa visibile al Consiglio insieme alle altre richieste della giornata{" "}
          {describeNextPublish()}.
        </Callout>
      )}

      {proposals.length === 0 ? (
        <EmptyState>Nessuna richiesta in votazione al momento.</EmptyState>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              myVote={p.votes.find((v) => v.memberId === member.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
