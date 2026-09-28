import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  FREE_BOARD_SEATS,
  FREE_STAFF_SEATS,
  GRANT_DURATION_LABELS,
  getActiveAccessGrant,
} from "@/lib/entitlements";
import { Pill, EmptyState, GhostButton } from "@/components/ui";
import { GrantForm } from "./grant-form";
import { revokeAccessGrantAction } from "./actions";

function fmtDate(date: Date) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(date);
}

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const organization = await prisma.organization.findUnique({ where: { id } });
  if (!organization) notFound();

  const [boardCount, staffCount, proposalCount, minutesCount, activeGrant, grants] = await Promise.all([
    prisma.member.count({ where: { organizationId: id, role: "BOARD", deletedAt: null } }),
    prisma.member.count({ where: { organizationId: id, role: "STAFF", deletedAt: null } }),
    prisma.proposal.count({ where: { organizationId: id } }),
    prisma.minutes.count({ where: { organizationId: id } }),
    getActiveAccessGrant(id),
    prisma.accessGrant.findMany({
      where: { organizationId: id },
      include: { grantedBy: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const paidBoardSeats = Math.max(0, boardCount - FREE_BOARD_SEATS);

  return (
    <div className="space-y-6 pb-10">
      <Link href="/quitebold/organizzazioni" className="text-[12.5px] font-semibold text-navy-soft">
        ← Organizzazioni
      </Link>

      <div>
        <h1 className="font-display text-[22px] font-semibold">{organization.name}</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {organization.legalForm || "Forma giuridica non impostata"} ·{" "}
          {organization.registeredOffice || "Sede legale non impostata"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-paper-raised p-3.5 text-center">
          <span className="block font-mono text-[20px] font-bold">
            {boardCount}
            <span className="text-[12px] text-ink-soft">/{FREE_BOARD_SEATS} gratis</span>
          </span>
          <span className="text-[10.5px] uppercase tracking-wide text-ink-soft">Consiglieri</span>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-3.5 text-center">
          <span className="block font-mono text-[20px] font-bold">
            {staffCount}
            <span className="text-[12px] text-ink-soft">/{FREE_STAFF_SEATS} gratis</span>
          </span>
          <span className="text-[10.5px] uppercase tracking-wide text-ink-soft">Staff</span>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-3.5 text-center">
          <span className="block font-mono text-[20px] font-bold">{proposalCount}</span>
          <span className="text-[10.5px] uppercase tracking-wide text-ink-soft">Richieste</span>
        </div>
        <div className="rounded-xl border border-line bg-paper-raised p-3.5 text-center">
          <span className="block font-mono text-[20px] font-bold">{minutesCount}</span>
          <span className="text-[10.5px] uppercase tracking-wide text-ink-soft">Verbali</span>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-paper-raised p-5">
        <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink-soft">Stato del piano</h3>
        {activeGrant ? (
          <div className="flex items-start justify-between gap-3">
            <div>
              <Pill tone="approved">Sbloccato manualmente</Pill>
              <p className="mt-2 text-[13px] text-ink-soft">
                Durata: <b className="text-ink">{GRANT_DURATION_LABELS[activeGrant.duration]}</b> · Scadenza:{" "}
                <b className="text-ink">
                  {activeGrant.expiresAt ? fmtDate(activeGrant.expiresAt) : "nessuna (Lifetime)"}
                </b>
              </p>
              {activeGrant.note && <p className="mt-1 text-[12.5px] italic text-ink-soft">{activeGrant.note}</p>}
            </div>
            <form action={revokeAccessGrantAction.bind(null, activeGrant.id)}>
              <GhostButton type="submit">Revoca sblocco</GhostButton>
            </form>
          </div>
        ) : (
          <div>
            <Pill tone="pending">Piano gratuito / a pagamento standard</Pill>
            <p className="mt-2 text-[13px] text-ink-soft">
              {paidBoardSeats > 0
                ? `${FREE_BOARD_SEATS} posti gratuiti + ${paidBoardSeats} a pagamento (fatturazione non ancora integrata).`
                : `Entro il limite gratuito di ${FREE_BOARD_SEATS} consiglieri e ${FREE_STAFF_SEATS} membri dello staff.`}
            </p>
          </div>
        )}
      </div>

      <GrantForm organizationId={organization.id} />

      <div>
        <h3 className="mb-2.5 text-[12px] font-bold uppercase tracking-wide text-ink-soft">
          Storico sblocchi
        </h3>
        {grants.length === 0 ? (
          <EmptyState>Nessuno sblocco manuale concesso finora.</EmptyState>
        ) : (
          <div className="space-y-2">
            {grants.map((g) => (
              <div key={g.id} className="rounded-xl border border-line bg-paper-raised p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold">{GRANT_DURATION_LABELS[g.duration]}</span>
                  {g.revokedAt ? (
                    <Pill tone="rejected">Revocato</Pill>
                  ) : g.expiresAt && g.expiresAt < new Date() ? (
                    <Pill tone="rejected">Scaduto</Pill>
                  ) : (
                    <Pill tone="approved">Attivo</Pill>
                  )}
                </div>
                <div className="mt-1 text-[11.5px] text-ink-soft">
                  Concesso da {g.grantedBy.firstName} {g.grantedBy.lastName} il {fmtDate(g.createdAt)}
                  {g.expiresAt ? ` · scade il ${fmtDate(g.expiresAt)}` : " · nessuna scadenza"}
                </div>
                {g.note && <div className="mt-1 text-[12px] italic text-ink-soft">{g.note}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
