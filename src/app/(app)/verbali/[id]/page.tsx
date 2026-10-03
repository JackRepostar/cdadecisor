import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMember, displayName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { humanFileSize } from "@/lib/proposal-helpers";
import type { MinutesSnapshot } from "@/lib/minutes";
import { Pill, Callout, GhostButton } from "@/components/ui";
import { SignMinutesForm } from "./sign-minutes-form";
import { APP_TIMEZONE } from "@/lib/app-timezone";

function formatItDate(iso: string) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: APP_TIMEZONE, day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso)
  );
}

export default async function VerbaleDetailPage({ params }: PageProps<"/verbali/[id]">) {
  const { id } = await params;
  const member = await requireMember();
  if (member.role === "STAFF") redirect("/assegnate");

  const minutes = await prisma.minutes.findUnique({ where: { id }, include: { signedBy: true } });
  if (!minutes || minutes.organizationId !== member.organizationId) notFound();

  const snapshot = minutes.snapshot as unknown as MinutesSnapshot;
  const canSign = member.isPresident && !minutes.signedAt;

  return (
    <div className="space-y-5 pb-10">
      <Link href="/verbali" className="text-[12.5px] font-semibold text-navy-soft">
        ← Verbali del Consiglio
      </Link>

      <div>
        <div className="mb-1.5 text-xs text-ink-soft">
          Periodo dal {new Intl.DateTimeFormat("it-IT", { timeZone: APP_TIMEZONE, dateStyle: "long" }).format(minutes.periodStart)}{" "}
          al {new Intl.DateTimeFormat("it-IT", { timeZone: APP_TIMEZONE, dateStyle: "long" }).format(minutes.periodEnd)}
        </div>
        <h1 className="font-display text-[22px] font-semibold">Verbale del Consiglio di Amministrazione</h1>
        <div className="mt-2 flex items-center gap-2">
          {minutes.signedAt ? (
            <Pill tone="approved">Firmato</Pill>
          ) : (
            <Pill tone="pending">Da firmare</Pill>
          )}
          <span className="text-[12.5px] text-ink-soft">
            Presidente: {snapshot.presidentName ?? "non designato"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <a href={`/verbali/${minutes.id}/pdf`}>
          <GhostButton type="button">⬇️ Scarica PDF</GhostButton>
        </a>
        {member.role === "ADMIN" && (
          <Link href={`/verbali/${minutes.id}/email`}>
            <GhostButton type="button">✉️ Vedi l&apos;email inviata ai consiglieri</GhostButton>
          </Link>
        )}
      </div>

      {minutes.signedAt ? (
        <Callout tone="gold" title="Verbale firmato">
          Firmato da {minutes.signedBy ? displayName(minutes.signedBy) : "—"} il{" "}
          {new Intl.DateTimeFormat("it-IT", { timeZone: APP_TIMEZONE, dateStyle: "long", timeStyle: "short" }).format(minutes.signedAt)}
          . Firma elettronica in modalità dimostrativa: non ha ancora valore legale equivalente
          alla sottoscrizione autografa.
        </Callout>
      ) : canSign ? (
        <SignMinutesForm minutesId={minutes.id} />
      ) : (
        <div className="rounded-lg bg-pending-bg px-3 py-2.5 text-sm text-ink">
          In attesa che il Presidente ({snapshot.presidentName ?? "non ancora designato"}) firmi
          il verbale.
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-[12px] font-bold uppercase tracking-wide text-ink-soft">
          Delibere del periodo ({snapshot.proposals.length})
        </h2>
        {snapshot.proposals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-soft">
            Nessuna delibera è stata assunta in questo periodo.
          </div>
        ) : (
          snapshot.proposals.map((p) => (
            <div key={p.id} className="rounded-2xl border border-line bg-paper-raised p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="font-display text-[16px] font-semibold">{p.title}</div>
                {p.outcome === "APPROVED" ? (
                  <Pill tone="approved">Approvata</Pill>
                ) : (
                  <Pill tone="rejected">Respinta</Pill>
                )}
              </div>
              <div className="mt-1 text-[11.5px] text-ink-soft">
                Proposta da {p.authorName} · chiusa il {p.closedAt ? formatItDate(p.closedAt) : "—"}
              </div>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">{p.description}</p>

              <div className="mt-3 divide-y divide-line">
                {p.votes.map((v, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-1.5 text-[13px]">
                    <span
                      className={`mt-0.5 flex h-[20px] w-[20px] flex-none items-center justify-center rounded-full text-[10px] font-extrabold text-white ${
                        v.choice === "YES" ? "bg-good" : "bg-bad"
                      }`}
                    >
                      {v.choice === "YES" ? "✓" : "✕"}
                    </span>
                    <div>
                      <b className="block">{v.memberName}</b>
                      <span className="text-ink-soft">{v.motivation}</span>
                    </div>
                  </div>
                ))}
              </div>

              {p.staffFeedback.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-line pt-2">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                    Pareri staff (non vincolanti)
                  </div>
                  {p.staffFeedback.map((f, i) => (
                    <div key={i} className="text-[12.5px] text-ink-soft">
                      {f.preference === "POSITIVE" ? "👍" : "👎"} <b className="text-ink">{f.memberName}</b> —{" "}
                      {f.comment}
                    </div>
                  ))}
                </div>
              )}

              {p.attachments.length > 0 && (
                <div className="mt-2 border-t border-line pt-2 text-[11.5px] text-ink-soft">
                  {p.attachments.map((a, i) => (
                    <span key={i}>
                      📎 {a.filename} ({humanFileSize(a.size)})
                      {i < p.attachments.length - 1 ? " · " : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
