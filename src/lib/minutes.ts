import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/member-format";
import { humanFileSize } from "@/lib/proposal-helpers";
import { isEmailSendingEnabled, sendEmail } from "@/lib/email-sender";

const PERIOD_DAYS = 30;

export type MinutesSnapshotVote = { memberName: string; choice: "YES" | "NO"; motivation: string };
export type MinutesSnapshotFeedback = {
  memberName: string;
  preference: "POSITIVE" | "NEGATIVE";
  comment: string;
};
export type MinutesSnapshotAttachment = { filename: string; size: number };
export type MinutesSnapshotProposal = {
  id: string;
  title: string;
  description: string;
  authorName: string;
  createdAt: string;
  closedAt: string | null;
  outcome: "APPROVED" | "REJECTED" | null;
  votes: MinutesSnapshotVote[];
  staffFeedback: MinutesSnapshotFeedback[];
  attachments: MinutesSnapshotAttachment[];
};
export type MinutesSnapshotMember = { name: string; jobTitle: string };
export type MinutesSnapshot = {
  presidentName: string | null;
  // Componenti del CdA in carica al momento della generazione (assenti nei verbali
  // creati prima di questa funzionalità: in quel caso si usa il CdA attuale).
  boardMembers?: MinutesSnapshotMember[];
  proposals: MinutesSnapshotProposal[];
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatItDate(iso: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso)
  );
}

async function buildSnapshot(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<MinutesSnapshot> {
  const [president, boardMembers, proposals] = await Promise.all([
    prisma.member.findFirst({ where: { organizationId, isPresident: true, deletedAt: null } }),
    prisma.member.findMany({
      where: { organizationId, role: "BOARD", deletedAt: null },
      orderBy: { firstName: "asc" },
    }),
    prisma.proposal.findMany({
      where: { organizationId, status: "CLOSED", closedAt: { gte: periodStart, lt: periodEnd } },
      include: {
        author: true,
        votes: { include: { member: true } },
        staffFeedback: { include: { member: true } },
        attachments: true,
      },
      orderBy: { closedAt: "asc" },
    }),
  ]);

  return {
    presidentName: president ? displayName(president) : null,
    boardMembers: boardMembers.map((m) => ({ name: displayName(m), jobTitle: m.jobTitle })),
    proposals: proposals.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      authorName: displayName(p.author),
      createdAt: p.createdAt.toISOString(),
      closedAt: p.closedAt ? p.closedAt.toISOString() : null,
      outcome: p.outcome,
      votes: p.votes.map((v) => ({
        memberName: displayName(v.member),
        choice: v.choice,
        motivation: v.motivation,
      })),
      staffFeedback: p.staffFeedback.map((f) => ({
        memberName: displayName(f.member),
        preference: f.preference,
        comment: f.comment,
      })),
      attachments: p.attachments.map((a) => ({ filename: a.filename, size: a.size })),
    })),
  };
}

export function buildMinutesEmailHtml(params: {
  recipientName: string;
  periodStart: Date;
  periodEnd: Date;
  snapshot: MinutesSnapshot;
}) {
  const { recipientName, periodStart, periodEnd, snapshot } = params;

  const body = snapshot.proposals.length
    ? snapshot.proposals
        .map((p) => {
          const outcomeLabel = p.outcome === "APPROVED" ? "Approvata" : "Respinta";
          const outcomeColor = p.outcome === "APPROVED" ? "#2F7D5A" : "#B0392B";
          const votesHtml = p.votes
            .map(
              (v) =>
                `<div style="font-size:12px;color:#4A5164;padding:3px 0;">${
                  v.choice === "YES" ? "✓" : "✕"
                } <b style="color:#1C1F26;">${escapeHtml(v.memberName)}</b> — ${escapeHtml(v.motivation)}</div>`
            )
            .join("");
          const feedbackHtml = p.staffFeedback.length
            ? `<div style="margin-top:8px;font-size:11px;color:#8b8471;text-transform:uppercase;letter-spacing:.06em;">Pareri staff (non vincolanti)</div>` +
              p.staffFeedback
                .map(
                  (f) =>
                    `<div style="font-size:12px;color:#4A5164;padding:3px 0;">${
                      f.preference === "POSITIVE" ? "👍" : "👎"
                    } <b style="color:#1C1F26;">${escapeHtml(f.memberName)}</b> — ${escapeHtml(f.comment)}</div>`
                )
                .join("")
            : "";
          const attachmentsHtml = p.attachments.length
            ? `<div style="margin-top:8px;font-size:11px;color:#8b8471;">${p.attachments
                .map((a) => `📎 ${escapeHtml(a.filename)} (${humanFileSize(a.size)})`)
                .join(" · ")}</div>`
            : "";
          return `<div style="border:1px solid #EFEBDD;border-radius:8px;padding:16px 18px;margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#1C1F26;font-family:Georgia,serif;">${escapeHtml(p.title)}</div>
            <div style="font-size:11.5px;color:#8b8471;margin:4px 0 10px;font-family:Arial,sans-serif;">Proposta da ${escapeHtml(p.authorName)} · chiusa il ${p.closedAt ? formatItDate(p.closedAt) : "—"} · <span style="color:${outcomeColor};font-weight:700;">${outcomeLabel}</span></div>
            <div style="font-size:12.5px;color:#4A5164;margin-bottom:10px;font-family:Arial,sans-serif;">${escapeHtml(p.description)}</div>
            ${votesHtml}
            ${feedbackHtml}
            ${attachmentsHtml}
          </div>`;
        })
        .join("")
    : `<p style="font-size:13px;color:#4A5164;font-family:Arial,sans-serif;">Nessuna delibera è stata assunta in questo periodo.</p>`;

  return `<!doctype html><html><body style="margin:0;background:#F1EEE4;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1EEE4;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#1B2A41,#2C4160);padding:26px 32px;">
    <div style="color:#F1E6C8;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-family:Arial,sans-serif;">CdaDecisor</div>
    <div style="color:#ffffff;font-size:19px;font-weight:700;margin-top:6px;font-family:Georgia,serif;">Verbale del Consiglio di Amministrazione</div>
    <div style="color:#C9D2DE;font-size:12px;margin-top:4px;font-family:Arial,sans-serif;">Periodo dal ${formatItDate(periodStart.toISOString())} al ${formatItDate(periodEnd.toISOString())}</div>
  </td></tr>
  <tr><td style="padding:28px 32px 6px;">
    <p style="font-size:14px;color:#1C1F26;margin:0 0 14px;font-family:Georgia,serif;">Gentile ${escapeHtml(recipientName)},</p>
    <p style="font-size:13.5px;color:#4A5164;line-height:1.6;margin:0 0 18px;font-family:Arial,sans-serif;">in allegato il verbale periodico con le delibere assunte dal Consiglio nell'ultimo mese.</p>
    ${body}
    <p style="font-size:11.5px;color:#8b8471;margin-top:6px;font-family:Arial,sans-serif;">Presidente: ${escapeHtml(snapshot.presidentName ?? "non ancora designato")}</p>
  </td></tr>
  <tr><td style="padding:16px 32px 28px;border-top:1px solid #EFEBDD;">
    <div style="font-size:11px;color:#9A9382;font-family:Arial,sans-serif;line-height:1.6;">Notifica automatica di CdaDecisor. Il verbale ufficiale è consultabile e firmabile dalla sezione "Verbali" dell'applicativo.</div>
  </td></tr>
</table></td></tr></table></body></html>`;
}

async function generateMinutesFor(organizationId: string, periodStart: Date, periodEnd: Date) {
  const snapshot = await buildSnapshot(organizationId, periodStart, periodEnd);

  const minutes = await prisma.minutes.create({
    data: {
      organizationId,
      periodStart,
      periodEnd,
      snapshot: snapshot as object,
    },
  });

  const recipients = await prisma.member.findMany({
    where: { organizationId, role: "BOARD", deletedAt: null },
  });

  for (const recipient of recipients) {
    const html = buildMinutesEmailHtml({
      recipientName: displayName(recipient),
      periodStart,
      periodEnd,
      snapshot,
    });
    const subject = `Verbale del Consiglio — periodo ${formatItDate(periodStart.toISOString())} / ${formatItDate(periodEnd.toISOString())}`;
    await prisma.minutesNotification.create({
      data: {
        minutesId: minutes.id,
        toEmail: recipient.email,
        toName: displayName(recipient),
        subject,
        htmlBody: html,
      },
    });

    if (isEmailSendingEnabled()) {
      await sendEmail({ to: recipient.email, subject, html });
    } else {
      console.log(`📋 [DEV] Verbale registrato per ${recipient.email}`);
    }
  }
}

async function ensureMinutesGenerationForOrganization(organizationId: string) {
  const now = new Date();

  const last = await prisma.minutes.findFirst({
    where: { organizationId },
    orderBy: { periodEnd: "desc" },
  });
  let periodStart: Date;
  if (last) {
    periodStart = last.periodEnd;
  } else {
    const first = await prisma.proposal.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    });
    if (!first) return;
    periodStart = first.createdAt;
  }

  let periodEnd = addDays(periodStart, PERIOD_DAYS);
  // Limite di sicurezza: non generare più di 24 periodi in una sola chiamata.
  let guard = 0;
  while (periodEnd <= now && guard < 24) {
    await generateMinutesFor(organizationId, periodStart, periodEnd);
    periodStart = periodEnd;
    periodEnd = addDays(periodStart, PERIOD_DAYS);
    guard += 1;
  }
}

/**
 * Da chiamare una volta per richiesta (layout dell'area autenticata). Genera in
 * automatico un verbale ogni 30 giorni per OGNI organizzazione, ancorato alla data
 * della prima richiesta mai creata da quella specifica azienda; recupera eventuali
 * periodi arretrati in sequenza se l'app non è stata visitata per un po' (non c'è un
 * cron esterno in questo ambiente locale, vedi però /api/cron/tick).
 */
export const ensureMinutesGeneration = cache(async () => {
  const organizations = await prisma.organization.findMany({ select: { id: true } });
  for (const org of organizations) {
    await ensureMinutesGenerationForOrganization(org.id);
  }
});
