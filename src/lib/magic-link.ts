import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isEmailSendingEnabled, sendEmail } from "@/lib/email-sender";

const TOKEN_TTL_MINUTES = 15;

export type MagicLinkResult =
  | { status: "not_found" }
  | { status: "rejected" }
  | { status: "sent"; devLoginUrl: string | null };

/**
 * Crea (se l'email corrisponde a un membro attivo) un token di accesso monouso.
 * In sviluppo l'email non parte davvero: l'URL viene restituito per essere mostrato
 * a schermo, così il flusso resta testabile senza un provider email configurato.
 */
export async function requestMagicLink(rawEmail: string): Promise<MagicLinkResult> {
  const email = rawEmail.trim().toLowerCase();

  const member = await prisma.member.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
  });

  if (!member) return { status: "not_found" };
  if (member.role === "BOARD" && member.status === "REJECTED") {
    return { status: "rejected" };
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000);

  await prisma.magicLinkToken.create({
    data: { token, memberId: member.id, expiresAt },
  });

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const loginUrl = `${baseUrl}/auth/verifica?token=${token}`;

  if (isEmailSendingEnabled()) {
    await sendEmail({
      to: member.email,
      subject: "Il tuo link di accesso a CdaDecisor",
      html: buildLoginEmailHtml(member.firstName, loginUrl),
    });
    return { status: "sent", devLoginUrl: null };
  }

  console.log(`\n✉️  [DEV] Link di accesso per ${member.email}:\n${loginUrl}\n`);
  return { status: "sent", devLoginUrl: loginUrl };
}

function buildLoginEmailHtml(firstName: string, loginUrl: string) {
  return `<!doctype html><html><body style="margin:0;background:#F1EEE4;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1EEE4;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="440" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#1B2A41,#2C4160);padding:24px 32px;">
    <div style="color:#F1E6C8;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-family:Arial,sans-serif;">CdaDecisor</div>
    <div style="color:#ffffff;font-size:18px;font-weight:700;margin-top:6px;font-family:Georgia,serif;">Il tuo link di accesso</div>
  </td></tr>
  <tr><td style="padding:26px 32px 8px;">
    <p style="font-size:14px;color:#1C1F26;margin:0 0 14px;font-family:Georgia,serif;">Gentile ${firstName},</p>
    <p style="font-size:13.5px;color:#4A5164;line-height:1.6;margin:0 0 20px;font-family:Arial,sans-serif;">Usa il pulsante qui sotto per accedere a CdaDecisor. Il link è valido 15 minuti e può essere usato una sola volta.</p>
  </td></tr>
  <tr><td style="padding:0 32px 28px;text-align:center;">
    <a href="${loginUrl}" style="display:inline-block;background:#1B2A41;color:#F1E6C8;font-family:Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:13px 30px;border-radius:8px;">Accedi a CdaDecisor →</a>
  </td></tr>
  <tr><td style="padding:16px 32px 26px;border-top:1px solid #EFEBDD;">
    <div style="font-size:11px;color:#9A9382;font-family:Arial,sans-serif;line-height:1.6;">Se non hai richiesto tu questo accesso, ignora questa email.</div>
  </td></tr>
</table></td></tr></table></body></html>`;
}

export type VerifyResult =
  | { status: "ok"; memberId: string }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "used" };

export async function verifyMagicLinkToken(token: string): Promise<VerifyResult> {
  const record = await prisma.magicLinkToken.findUnique({ where: { token } });
  if (!record) return { status: "invalid" };
  if (record.usedAt) return { status: "used" };
  if (record.expiresAt < new Date()) return { status: "expired" };

  await prisma.magicLinkToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { status: "ok", memberId: record.memberId };
}
