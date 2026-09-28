import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireMember, displayName } from "@/lib/auth";
import { describeNextPublish } from "@/lib/publish";
import { formatDate, tally, wasSubmittedByAdmin } from "@/lib/proposal-helpers";
import { Pill, EmptyState, Callout } from "@/components/ui";

type Filter = "approved" | "rejected" | "open" | "all";

function isFilter(value: string | undefined): value is Filter {
  return value === "approved" || value === "rejected" || value === "open";
}

export default async function RegistroPage({ searchParams }: PageProps<"/registro">) {
  const member = await requireMember();
  const organizationId = member.organizationId;

  const params = await searchParams;
  const rawFilter = typeof params.stato === "string" ? params.stato : undefined;
  const filter: Filter = isFilter(rawFilter) ? rawFilter : "all";
  const justCreated = params.inviata === "1";

  const [proposals, approvedCount, rejectedCount, openCount, eligibleCount] = await Promise.all([
    prisma.proposal.findMany({
      where: {
        organizationId,
        ...(filter === "approved"
          ? { status: "CLOSED", outcome: "APPROVED" }
          : filter === "rejected"
            ? { status: "CLOSED", outcome: "REJECTED" }
            : filter === "open"
              ? { status: "OPEN" }
              : { status: { not: "DRAFT" } }),
      },
      include: { author: true, votes: true, attachments: true, staffAssignments: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.proposal.count({ where: { organizationId, status: "CLOSED", outcome: "APPROVED" } }),
    prisma.proposal.count({ where: { organizationId, status: "CLOSED", outcome: "REJECTED" } }),
    prisma.proposal.count({ where: { organizationId, status: "OPEN" } }),
    prisma.member.count({ where: { organizationId, role: "BOARD", status: "VERIFIED", deletedAt: null } }),
  ]);

  const stat = (key: Filter, count: number, label: string, tone: "good" | "bad" | "ink") => {
    const active = filter === key;
    const href = active ? "/registro" : (`/registro?stato=${key}` as const);
    const toneClass =
      tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-ink";
    return (
      <Link
        href={href}
        className={`flex-1 rounded-xl border px-3.5 py-3 text-left transition-colors ${
          active ? "border-gold bg-gold-soft" : "border-line bg-paper-raised hover:border-navy-soft"
        }`}
      >
        <span className={`block font-mono text-[22px] font-bold ${toneClass}`}>{count}</span>
        <span className="text-[11px] uppercase tracking-wide text-ink-soft">{label}</span>
      </Link>
    );
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="font-display text-[22px] font-semibold">Registro delle deliberazioni</h1>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            Storico completo con esito, voti e motivazioni. Filtra cliccando una categoria.
          </p>
        </div>
        {filter !== "all" && (
          <Link
            href="/registro"
            className="rounded-full bg-pending-bg px-3 py-1.5 text-[11.5px] font-bold text-gold"
          >
            Filtro attivo — mostra tutte ✕
          </Link>
        )}
      </div>

      {justCreated && (
        <Callout tone="gold" title="Richiesta registrata">
          Sarà resa visibile al Consiglio insieme alle altre richieste della giornata{" "}
          {describeNextPublish()}.
        </Callout>
      )}

      <div className="flex gap-2.5">
        {stat("approved", approvedCount, "Approvate", "good")}
        {stat("rejected", rejectedCount, "Respinte", "bad")}
        {stat("open", openCount, "In corso", "ink")}
      </div>

      {proposals.length === 0 ? (
        <EmptyState>Nessuna deliberazione in questa categoria.</EmptyState>
      ) : (
        <div className="space-y-2.5">
          {proposals.map((p) => {
            const t = tally(p.votes);
            const borderTone =
              p.status === "OPEN"
                ? "border-l-line"
                : p.outcome === "APPROVED"
                  ? "border-l-good"
                  : "border-l-bad";
            return (
              <Link key={p.id} href={`/richieste/${p.id}`} className="block">
                <div
                  className={`rounded-xl border border-l-4 border-line bg-paper-raised p-3.5 ${borderTone}`}
                >
                  <div className="flex items-baseline justify-between gap-2.5">
                    <span className="text-[14.5px] font-bold">{p.title}</span>
                    {p.status === "OPEN" ? (
                      <Pill tone="pending">In corso</Pill>
                    ) : p.outcome === "APPROVED" ? (
                      <Pill tone="approved">Approvata</Pill>
                    ) : (
                      <Pill tone="rejected">Respinta</Pill>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-soft">
                    <span>
                      Proposta da {displayName(p.author)} · {formatDate(p.createdAt)}
                    </span>
                    {p.attachments.length > 0 && (
                      <span className="rounded-full border border-line bg-paper px-2 py-0.5">
                        📎 {p.attachments.length}
                      </span>
                    )}
                    {p.staffAssignments.length > 0 && (
                      <span className="rounded-full border border-line bg-paper px-2 py-0.5">
                        👥 {p.staffAssignments.length}
                      </span>
                    )}
                    {wasSubmittedByAdmin(p) && <span className="italic">inserita dall&apos;amministratore</span>}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-3.5 font-mono text-[12.5px] text-ink-soft">
                    <span>
                      <b className="text-good">{t.yes}</b> favorevoli
                    </span>
                    <span>
                      <b className="text-bad">{t.no}</b> contrari
                    </span>
                    <span>{Math.max(0, eligibleCount - t.total)} astenuti/in attesa</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
