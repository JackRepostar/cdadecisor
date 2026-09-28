import "server-only";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/auth";
import { isEmailSendingEnabled, sendEmail } from "@/lib/email-sender";
import type { Member } from "@prisma/client";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildProposalEmailHtml(params: {
  recipientName: string;
  authorName: string;
  title: string;
  description: string;
  proposalUrl: string;
  attachmentNames: string[];
  staffNames: string[];
}) {
  const { recipientName, authorName, title, description, proposalUrl, attachmentNames, staffNames } = params;
  const excerpt = description.length > 220 ? `${description.slice(0, 220)}…` : description;

  const staffLine = staffNames.length
    ? `<p style="font-size:12px;color:#8b8471;font-family:Arial,sans-serif;margin:0 0 14px;">Per un parere consultivo è stato inoltre coinvolto: ${escapeHtml(staffNames.join(", "))}.</p>`
    : "";

  const attachmentsHtml = attachmentNames.length
    ? `<tr><td style="padding:0 32px 8px;font-family:Arial,sans-serif;">
         <div style="font-size:11px;color:#8b8471;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Allegati</div>
         ${attachmentNames.map((n) => `<div style="font-size:13px;color:#4A5164;padding:4px 0;">📎 ${escapeHtml(n)}</div>`).join("")}
       </td></tr>`
    : "";

  return `<!doctype html><html><body style="margin:0;background:#F1EEE4;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1EEE4;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#1B2A41,#2C4160);padding:26px 32px;">
    <div style="color:#F1E6C8;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-family:Arial,sans-serif;">CdaDecisor</div>
    <div style="color:#ffffff;font-size:19px;font-weight:700;margin-top:6px;font-family:Georgia,serif;">Nuova richiesta da approvare</div>
  </td></tr>
  <tr><td style="padding:28px 32px 6px;">
    <p style="font-size:14px;color:#1C1F26;margin:0 0 14px;font-family:Georgia,serif;">Gentile ${escapeHtml(recipientName)},</p>
    <p style="font-size:13.5px;color:#4A5164;line-height:1.6;margin:0 0 10px;font-family:Arial,sans-serif;">${escapeHtml(authorName)} ha sottoposto al Consiglio una nuova richiesta che necessita del tuo voto.</p>
    ${staffLine}
    <div style="background:#F7F5EF;border-left:4px solid #B8912F;border-radius:6px;padding:16px 18px;margin-bottom:6px;">
      <div style="font-size:16px;font-weight:700;color:#1C1F26;margin-bottom:6px;font-family:Georgia,serif;">${escapeHtml(title)}</div>
      <div style="font-size:13px;color:#4A5164;line-height:1.55;font-family:Arial,sans-serif;">${escapeHtml(excerpt)}</div>
    </div>
  </td></tr>
  ${attachmentsHtml}
  <tr><td style="padding:20px 32px 30px;text-align:center;">
    <a href="${proposalUrl}" style="display:inline-block;background:#1B2A41;color:#F1E6C8;font-family:Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:13px 30px;border-radius:8px;">Visualizza la richiesta e vota →</a>
  </td></tr>
  <tr><td style="padding:16px 32px 28px;border-top:1px solid #EFEBDD;">
    <div style="font-size:11px;color:#9A9382;font-family:Arial,sans-serif;line-height:1.6;">Notifica automatica di CdaDecisor. Il voto richiede l'accesso alla piattaforma con la tua email aziendale certificata.</div>
  </td></tr>
</table></td></tr></table></body></html>`;
}

/**
 * Genera e registra (in EmailNotification) l'email per ogni consigliere con diritto
 * di voto, escluso l'autore. In sviluppo non viene spedita: resta consultabile da
 * "Vedi l'email inviata ai consiglieri" nel dettaglio della richiesta.
 */
export async function notifyBoardOfNewProposal(proposalId: string) {
  const proposal = await prisma.proposal.findUniqueOrThrow({
    where: { id: proposalId },
    include: {
      author: true,
      attachments: true,
      staffAssignments: { include: { member: true } },
    },
  });

  const recipients = await prisma.member.findMany({
    where: {
      organizationId: proposal.organizationId,
      role: "BOARD",
      status: "VERIFIED",
      deletedAt: null,
      id: { not: proposal.authorId },
    },
  });

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const proposalUrl = `${baseUrl}/richieste/${proposal.id}`;
  const staffNames = proposal.staffAssignments.map((a) => displayName(a.member));
  const attachmentNames = proposal.attachments.map((a) => a.filename);

  for (const recipient of recipients) {
    const html = buildProposalEmailHtml({
      recipientName: displayName(recipient),
      authorName: displayName(proposal.author),
      title: proposal.title,
      description: proposal.description,
      proposalUrl,
      attachmentNames,
      staffNames,
    });

    await prisma.emailNotification.create({
      data: {
        proposalId: proposal.id,
        toEmail: recipient.email,
        toName: displayName(recipient),
        subject: `Nuova richiesta da approvare — ${proposal.title}`,
        htmlBody: html,
      },
    });

    if (isEmailSendingEnabled()) {
      await sendEmail({
        to: recipient.email,
        subject: `Nuova richiesta da approvare — ${proposal.title}`,
        html,
      });
    } else {
      console.log(`✉️  [DEV] Email "${proposal.title}" registrata per ${recipient.email}`);
    }
  }
}

export function memberDisplayName(member: Member) {
  return displayName(member);
}
