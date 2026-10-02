import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isDevLinkAllowed, isEmailSendingEnabled, sendEmail } from "@/lib/email-sender";

const TOKEN_TTL_MINUTES = 15;
// Il link "Vota" nel recap delle 15:00 può essere aperto ore dopo l'arrivo
// dell'email: validità più lunga del normale link di accesso, ma sempre monouso.
const RECAP_TOKEN_TTL_HOURS = 24;

function appBaseUrl() {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

/**
 * Crea un link di accesso monouso per ciascun membro indicato (recap giornaliero).
 * Restituisce memberId -> URL. L'URL contiene un'autenticazione: va solo nel
 * corpo dell'email spedita, mai nell'archivio consultabile dall'amministratore.
 */
export async function createRecapLoginUrls(memberIds: string[]) {
  const expiresAt = new Date(Date.now() + RECAP_TOKEN_TTL_HOURS * 3600_000);
  const rows = memberIds.map((memberId) => ({
    memberId,
    token: crypto.randomBytes(32).toString("base64url"),
    expiresAt,
  }));
  if (rows.length) await prisma.magicLinkToken.createMany({ data: rows });
  return new Map(rows.map((r) => [r.memberId, `${appBaseUrl()}/auth/verifica?token=${r.token}`]));
}

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

  const emailReady = isEmailSendingEnabled();
  if (!emailReady && !isDevLinkAllowed()) {
    console.error(
      "Accesso impossibile: nessun provider email configurato (RESEND_API_KEY o SMTP_*) e il link a schermo è disattivato in produzione."
    );
    return { status: "sent", devLoginUrl: null };
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000);

  await prisma.magicLinkToken.create({
    data: { token, memberId: member.id, expiresAt },
  });

  const loginUrl = `${appBaseUrl()}/auth/verifica?token=${token}`;

  if (emailReady) {
    try {
      await sendEmail({
        to: member.email,
        subject: "Il tuo link di accesso a CdaDecisor",
        html: buildLoginEmailHtml(member.firstName, loginUrl),
      });
    } catch (error) {
      // Risposta identica al caso "indirizzo non registrato": un errore del
      // provider non deve rivelare se l'email esiste né rompere la pagina.
      console.error("Invio del link di accesso fallito:", error);
      // Deroga esplicita e temporanea (ALLOW_DEV_LOGIN_LINKS): se l'invio non funziona
      // non si resta chiusi fuori. Senza deroga, in produzione, il link non si mostra mai.
      if (isDevLinkAllowed()) return { status: "sent", devLoginUrl: loginUrl };
    }
    return { status: "sent", devLoginUrl: null };
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n✉️  [DEV] Link di accesso per ${member.email}:\n${loginUrl}\n`);
  }
  return { status: "sent", devLoginUrl: loginUrl };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    <p style="font-size:14px;color:#1C1F26;margin:0 0 14px;font-family:Georgia,serif;">Gentile ${escapeHtml(firstName)},</p>
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

  // Consumo atomico: se due richieste arrivano insieme (es. un antivirus aziendale
  // e il destinatario) una sola può usare il link.
  const claimed = await prisma.magicLinkToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) return { status: "used" };

  return { status: "ok", memberId: record.memberId };
}
