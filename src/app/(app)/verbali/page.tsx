import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState, Pill } from "@/components/ui";
import type { MinutesSnapshot } from "@/lib/minutes";

function formatRange(start: Date, end: Date) {
  const fmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt.format(start)} — ${fmt.format(end)}`;
}

export default async function VerbaliPage() {
  const member = await requireMember();
  if (member.role === "STAFF") redirect("/assegnate");

  const minutesList = await prisma.minutes.findMany({
    where: { organizationId: member.organizationId },
    orderBy: { periodEnd: "desc" },
    include: { signedBy: true },
  });

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1 className="font-display text-[22px] font-semibold">Verbali del Consiglio</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          Generati automaticamente ogni 30 giorni con le delibere assunte nel periodo, e
          inviati a tutti i membri del CdA.
        </p>
      </div>

      {minutesList.length === 0 ? (
        <EmptyState>
          Nessun verbale ancora generato: verrà creato automaticamente 30 giorni dopo la
          prima richiesta sottoposta al Consiglio.
        </EmptyState>
      ) : (
        <div className="space-y-2.5">
          {minutesList.map((m) => {
            const snapshot = m.snapshot as unknown as MinutesSnapshot;
            return (
              <div
                key={m.id}
                className="flex items-center gap-2.5 rounded-xl border border-line bg-paper-raised p-3.5 hover:border-navy-soft"
              >
                <Link href={`/verbali/${m.id}`} className="flex-1">
                  <div className="flex items-baseline justify-between gap-2.5">
                    <span className="text-[14.5px] font-bold">{formatRange(m.periodStart, m.periodEnd)}</span>
                    {m.signedAt ? (
                      <Pill tone="approved">Firmato</Pill>
                    ) : (
                      <Pill tone="pending">Da firmare</Pill>
                    )}
                  </div>
                  <div className="mt-1 text-[12px] text-ink-soft">
                    {snapshot.proposals.length} delibere ·{" "}
                    {m.signedAt
                      ? `firmato da ${m.signedBy ? `${m.signedBy.firstName} ${m.signedBy.lastName}` : "—"}`
                      : `presidente: ${snapshot.presidentName ?? "non designato"}`}
                  </div>
                </Link>
                <a
                  href={`/verbali/${m.id}/pdf`}
                  className="flex-none rounded-full border border-line bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-ink-soft hover:text-ink"
                >
                  PDF
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
