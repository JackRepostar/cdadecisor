import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { FREE_BOARD_SEATS, getActiveAccessGrant, GRANT_DURATION_LABELS } from "@/lib/entitlements";
import { EmptyState, Pill } from "@/components/ui";

export default async function OrganizationsListPage() {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { members: true, proposals: true },
      },
    },
  });

  const rows = await Promise.all(
    organizations.map(async (org) => {
      const [boardCount, grant] = await Promise.all([
        prisma.member.count({ where: { organizationId: org.id, role: "BOARD", deletedAt: null } }),
        getActiveAccessGrant(org.id),
      ]);
      return { org, boardCount, grant };
    })
  );

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1 className="font-display text-[22px] font-semibold">Organizzazioni clienti</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          Tutte le aziende registrate su CdaDecisor, con stato del piano e sblocchi manuali.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState>Nessuna organizzazione registrata ancora.</EmptyState>
      ) : (
        <div className="space-y-2.5">
          {rows.map(({ org, boardCount, grant }) => (
            <Link key={org.id} href={`/quitebold/organizzazioni/${org.id}`} className="block">
              <div className="rounded-xl border border-line bg-paper-raised p-3.5 hover:border-navy-soft">
                <div className="flex items-center justify-between gap-2.5">
                  <span className="text-[14.5px] font-bold">{org.name}</span>
                  {grant ? (
                    <Pill tone="approved">Sbloccato · {GRANT_DURATION_LABELS[grant.duration]}</Pill>
                  ) : boardCount > FREE_BOARD_SEATS ? (
                    <Pill tone="pending">A pagamento</Pill>
                  ) : (
                    <Pill tone="staff">Gratuito</Pill>
                  )}
                </div>
                <div className="mt-1 text-[11.5px] text-ink-soft">
                  {org._count.members} membri totali · {org._count.proposals} richieste create
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
