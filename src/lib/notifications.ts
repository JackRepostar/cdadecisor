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

function buildRecapEmailHtml(params: {
  recipientName: string;
  organizationName: string;
  items: RecapItem[];
  ctaUrl: string;
  ctaLabel: string;
  intro: string;
}) {
  const { recipientName, organizationName, items, ctaUrl, ctaLabel, intro } = params;

  const itemsHtml = items
    .map((item) => {
      const excerpt = item.description.length > 180 ? `${item.description.slice(0, 180)}…` : item.description;
      const badge = item.isNew
        ? `<span style="display:inline-block;background:#B8912F;color:#ffffff;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:4px;padding:2px 7px;margin-left:8px;vertical-align:middle;">Nuova</span>`
        : "";
      const attachments = item.attachmentCount
        ? ` · 📎 ${item.attachmentCount} ${item.attachmentCount === 1 ? "allegato" : "allegati"}`
        : "";
      return `<div style="background:#F7F5EF;border-left:4px solid ${item.isNew ? "#B8912F" : "#C9C3B0"};border-radius:6px;padding:14px 16px;margin-bottom:10px;">
      <div style="font-size:15px;font-weight:700;color:#1C1F26;font-family:Georgia,serif;">${escapeHtml(item.title)}${badge}</div>
      <div style="font-size:11.5px;color:#8b8471;margin:3px 0 7px;font-family:Arial,sans-serif;">Proposta da ${escapeHtml(item.authorName)} · ${formatShortDate(item.createdAt)}${attachments}</div>
      <div style="font-size:13px;color:#4A5164;line-height:1.55;font-family:Arial,sans-serif;">${escapeHtml(excerpt)}</div>
    </div>`;
    })
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#F1EEE4;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1EEE4;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:100%;">
  <tr><td style="background:linear-gradient(135deg,#1B2A41,#2C4160);padding:26px 32px;">
    <div style="color:#F1E6C8;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-family:Arial,sans-serif;">CdaDecisor · ${escapeHtml(organizationName)}</div>
    <div style="color:#ffffff;font-size:19px;font-weight:700;margin-top:6px;font-family:Georgia,serif;">Recap delle richieste</div>
  </td></tr>
  <tr><td style="padding:28px 32px 6px;">
    <p style="font-size:14px;color:#1C1F26;margin:0 0 12px;font-family:Georgia,serif;">Gentile ${escapeHtml(recipientName)},</p>
    <p style="font-size:13.5px;color:#4A5164;line-height:1.6;margin:0 0 18px;font-family:Arial,sans-serif;">${escapeHtml(intro)}</p>
    ${itemsHtml}
  </td></tr>
  <tr><td style="padding:14px 32px 30px;text-align:center;">
    <a href="${ctaUrl}" style="display:inline-block;background:#1B2A41;color:#F1E6C8;font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 38px;border-radius:8px;">${escapeHtml(ctaLabel)} →</a>
  </td></tr>
  <tr><td style="padding:16px 32px 28px;border-top:1px solid #EFEBDD;">
    <div style="font-size:11px;color:#9A9382;font-family:Arial,sans-serif;line-height:1.6;">Notifica automatica di CdaDecisor, inviata una volta al giorno alla pubblicazione delle richieste. Il pulsante ti fa accedere direttamente, una sola volta e per 24 ore: non inoltrare questa email.</div>
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
    const common = {
      recipientName: displayName(member),
      organizationName: organization.name,
      items,
      ctaLabel: isBoard ? "Vota" : "Esprimi il tuo parere",
      intro: isBoard
        ? "Queste sono le richieste del Consiglio che attendono il tuo voto. Quelle contrassegnate come nuove sono state pubblicate oggi."
        : "Queste sono le richieste del Consiglio per cui è richiesto il tuo parere consultivo. Quelle contrassegnate come nuove sono state pubblicate oggi.",
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
