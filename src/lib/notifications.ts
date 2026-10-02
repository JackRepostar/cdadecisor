import "server-only";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/member-format";
import { isEmailSendingEnabled, sendEmails, type OutgoingEmail } from "@/lib/email-sender";
import { createRecapLoginUrls } from "@/lib/magic-link";
import { APP_TIMEZONE } from "@/lib/timezone";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type RecapItem = {
  title: string;
  description: string;
  authorName: string;
  createdAt: Date;
  attachmentCount: number;
  isNew: boolean;
};

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: APP_TIMEZONE }).format(date);
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: APP_TIMEZONE,
  }).format(date);
}

const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "Arial,Helvetica,sans-serif";

function plural(count: number, singular: string, pluralForm: string) {
  return count === 1 ? singular : pluralForm;
}

function buildRecapEmailHtml(params: {
  recipientName: string;
  organizationName: string;
  dateLabel: string;
  items: RecapItem[];
  ctaUrl: string;
  ctaLabel: string;
  intro: string;
  preheader: string;
}) {
  const { recipientName, organizationName, dateLabel, items, ctaUrl, ctaLabel, intro, preheader } = params;

  const itemsHtml = items
    .map((item) => {
      const excerpt = item.description.length > 180 ? `${item.description.slice(0, 180)}…` : item.description;
      const badge = item.isNew
        ? `<span style="display:inline-block;background:#B8912F;color:#ffffff;font:700 10px ${SANS};letter-spacing:.06em;text-transform:uppercase;border-radius:4px;padding:2px 7px;margin-left:8px;vertical-align:middle;">Nuova</span>`
        : "";
      const attachments = item.attachmentCount
        ? ` · ${item.attachmentCount} ${plural(item.attachmentCount, "allegato", "allegati")}`
        : "";
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;background:#F7F5EF;border-left:4px solid ${item.isNew ? "#B8912F" : "#C9C3B0"};border-radius:6px;"><tr><td style="padding:14px 16px;">
      <div style="font:700 15px/1.35 ${SERIF};color:#1C1F26;">${escapeHtml(item.title)}${badge}</div>
      <div style="font:12px/1.4 ${SANS};color:#8B8471;margin:4px 0 8px;">Proposta da ${escapeHtml(item.authorName)} · ${formatShortDate(item.createdAt)}${attachments}</div>
      <div style="font:13px/1.55 ${SANS};color:#4A5164;">${escapeHtml(excerpt)}</div>
    </td></tr></table>`;
    })
    .join("");

  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">
<style>@media only screen and (max-width:480px){.px{padding-left:20px!important;padding-right:20px!important}}</style></head>
<body style="margin:0;padding:0;background:#F1EEE4;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1EEE4;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td class="px" style="background-color:#1B2A41;background-image:linear-gradient(135deg,#1B2A41,#2C4160);padding:26px 32px;">
    <div style="color:#F1E6C8;font:11px ${SANS};letter-spacing:.16em;text-transform:uppercase;">CdaDecisor · ${escapeHtml(organizationName)}</div>
    <div style="color:#ffffff;font:700 21px ${SERIF};margin-top:6px;">Recap delle richieste</div>
    <div style="color:#C9D2DE;font:12px ${SANS};margin-top:4px;">${escapeHtml(dateLabel)}</div>
  </td></tr>
  <tr><td class="px" style="padding:28px 32px 6px;">
    <p style="font:14px ${SERIF};color:#1C1F26;margin:0 0 12px;">Gentile ${escapeHtml(recipientName)},</p>
    <p style="font:13.5px/1.6 ${SANS};color:#4A5164;margin:0 0 18px;">${escapeHtml(intro)}</p>
    ${itemsHtml}
  </td></tr>
  <tr><td class="px" style="padding:14px 32px 30px;">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td bgcolor="#1B2A41" align="center" style="border-radius:8px;">
      <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 40px;color:#F1E6C8;font:700 15px ${SANS};text-decoration:none;letter-spacing:.01em;">${escapeHtml(ctaLabel)} →</a>
    </td></tr></table>
  </td></tr>
  <tr><td class="px" style="padding:16px 32px 26px;border-top:1px solid #EFEBDD;">
    <div style="font:11px/1.6 ${SANS};color:#9A9382;">Notifica automatica di CdaDecisor, inviata una volta al giorno alla pubblicazione delle richieste. Il pulsante ti fa accedere direttamente, una sola volta e per 24 ore: non inoltrare questa email.</div>
  </td></tr>
</table></td></tr></table></body></html>`;
}

/**
 * Invia a ogni destinatario UN SOLO recap con tutte le richieste che attendono il
 * suo intervento, subito dopo la pubblicazione giornaliera. Consiglieri: richieste
 * aperte su cui non hanno ancora votato (compresa una propria: la richiesta si
 * chiude solo quando votano tutti). Staff: richieste aperte a cui sono assegnati e
 * su cui non hanno ancora lasciato un parere. Chi non ha nulla di nuovo da fare
 * oggi non riceve nulla.
 *
 * Il pulsante porta alla home già autenticato (link personale monouso). Quel link
 * è una credenziale: nell'archivio consultabile dall'amministratore ("Vedi l'email
 * inviata") viene salvata una copia con il link normale alla piattaforma.
 */
export async function sendRecapForOrganization(organizationId: string, newProposalIds: string[]) {
  const newIds = new Set(newProposalIds);

  const [organization, openProposals, recipients] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true } }),
    prisma.proposal.findMany({
      where: { organizationId, status: "OPEN" },
      orderBy: { createdAt: "asc" },
      include: {
        author: true,
        attachments: { select: { id: true } },
        votes: { select: { memberId: true } },
        staffAssignments: { select: { memberId: true } },
        staffFeedback: { select: { memberId: true } },
      },
    }),
    prisma.member.findMany({
      where: { organizationId, role: { in: ["BOARD", "STAFF"] }, status: "VERIFIED", deletedAt: null },
    }),
  ]);

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const now = new Date();

  const plans = recipients
    .map((member) => {
      const pending = openProposals.filter((p) =>
        member.role === "BOARD"
          ? !p.votes.some((v) => v.memberId === member.id)
          : p.staffAssignments.some((a) => a.memberId === member.id) &&
            !p.staffFeedback.some((f) => f.memberId === member.id)
      );
      // Nuove di oggi per prime, poi quelle ancora aperte dai giorni scorsi.
      pending.sort((a, b) => Number(newIds.has(b.id)) - Number(newIds.has(a.id)));
      return { member, pending };
    })
    .filter(({ pending }) => pending.some((p) => newIds.has(p.id)));

  if (plans.length === 0) return { recipients: 0, sent: 0, failed: 0 };

  const sendingEnabled = isEmailSendingEnabled();
  const loginUrls = sendingEnabled
    ? await createRecapLoginUrls(plans.map((p) => p.member.id))
    : new Map<string, string>();

  const messages: OutgoingEmail[] = [];
  const archive: {
    proposalId: string;
    toEmail: string;
    toName: string;
    subject: string;
    htmlBody: string;
  }[] = [];

  for (const { member, pending } of plans) {
    const isBoard = member.role === "BOARD";
    const items: RecapItem[] = pending.map((p) => ({
      title: p.title,
      description: p.description,
      authorName: displayName(p.author),
      createdAt: p.createdAt,
      attachmentCount: p.attachments.length,
      isNew: newIds.has(p.id),
    }));
    const count = items.length;
    const subject = isBoard
      ? `${count === 1 ? "1 richiesta in attesa" : `${count} richieste in attesa`} del tuo voto — CdaDecisor`
      : `${count === 1 ? "1 richiesta" : `${count} richieste`} per cui è richiesto il tuo parere — CdaDecisor`;
    const newCount = items.filter((i) => i.isNew).length;
    const todayNote =
      newCount === 0 ? "" : newCount === 1 ? " Una è stata pubblicata oggi." : ` ${newCount} sono state pubblicate oggi.`;
    const common = {
      recipientName: displayName(member),
      organizationName: organization.name,
      dateLabel: formatLongDate(now),
      items,
      ctaLabel: isBoard ? "Vota" : "Esprimi il tuo parere",
      intro: isBoard
        ? `Queste sono le richieste del Consiglio che attendono il tuo voto.${todayNote}`
        : `Queste sono le richieste del Consiglio per cui è richiesto il tuo parere consultivo, che non è vincolante.${todayNote}`,
      preheader: isBoard
        ? `${newCount ? `${newCount} ${plural(newCount, "nuova", "nuove")} oggi. ` : ""}Apri CdaDecisor per votare.`
        : "Apri CdaDecisor per lasciare il tuo parere.",
    };

    // Copia archiviata: senza il link personale di accesso.
    const archivedHtml = buildRecapEmailHtml({ ...common, ctaUrl: `${baseUrl}/` });
    for (const p of pending.filter((p) => newIds.has(p.id))) {
      archive.push({
        proposalId: p.id,
        toEmail: member.email,
        toName: displayName(member),
        subject,
        htmlBody: archivedHtml,
      });
    }

    const loginUrl = loginUrls.get(member.id);
    if (sendingEnabled && loginUrl) {
      messages.push({
        to: member.email,
        subject,
        html: buildRecapEmailHtml({ ...common, ctaUrl: loginUrl }),
      });
    } else {
      console.log(`✉️  [DEV] Recap registrato per ${member.email} (${count} richieste)`);
    }
  }

  await prisma.emailNotification.createMany({ data: archive });

  if (messages.length === 0) return { recipients: plans.length, sent: 0, failed: 0 };

  const { sent, failed } = await sendEmails(messages);
  for (const failure of failed) {
    console.error(`Recap non consegnato a ${failure.to}: ${failure.error}`);
  }
  return { recipients: plans.length, sent, failed: failed.length };
}
