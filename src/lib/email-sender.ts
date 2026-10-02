import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Unico punto di invio email reale dell'applicativo. Due provider, scelti dalle
 * variabili d'ambiente (Resend ha la precedenza se entrambi sono configurati):
 *  - Resend (API HTTP): RESEND_API_KEY, richiede un dominio verificato via DNS.
 *  - SMTP (es. Gmail / Google Workspace con "password per le app"): SMTP_HOST,
 *    SMTP_USER, SMTP_PASS. Non richiede modifiche ai DNS.
 * Finché nessuno dei due è configurato chi chiama deve restare dietro un controllo
 * `isEmailSendingEnabled()`: in sviluppo l'app registra soltanto le email.
 */
export type OutgoingEmail = { to: string; subject: string; html: string };

function hasResend() {
  return Boolean(process.env.RESEND_API_KEY);
}

function hasSmtp() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function isEmailSendingEnabled() {
  return hasResend() || hasSmtp();
}

/**
 * In produzione il link di accesso non deve mai comparire a schermo: chiunque
 * conoscesse l'email di un utente potrebbe entrare al suo posto. È ammesso solo in
 * sviluppo locale, oppure in produzione con ALLOW_DEV_LOGIN_LINKS=true come deroga
 * esplicita e temporanea (e comunque mai se un provider email è configurato).
 */
export function isDevLinkAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_LOGIN_LINKS === "true";
}

function getFrom() {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (!hasResend() && hasSmtp()) return `CdaDecisor <${process.env.SMTP_USER}>`;
  return "CdaDecisor <notifiche@quitebold.com>";
}

let smtpTransporter: Transporter | null = null;

function getSmtpTransporter() {
  if (!smtpTransporter) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return smtpTransporter;
}

const RESEND_HEADERS = () => ({
  Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
  "Content-Type": "application/json",
});

async function sendViaResend(params: OutgoingEmail) {
  const body = JSON.stringify({ from: getFrom(), to: params.to, subject: params.subject, html: params.html });
  // Resend limita a 2 richieste al secondo: un solo nuovo tentativo dopo una breve pausa.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: RESEND_HEADERS(),
      body,
    });
    if (response.ok) return;
    if (response.status === 429 && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
      continue;
    }
    const text = await response.text();
    throw new Error(`Invio email a ${params.to} fallito (${response.status}): ${text}`);
  }
}

export async function sendEmail(params: OutgoingEmail) {
  if (hasResend()) return sendViaResend(params);
  if (hasSmtp()) {
    await getSmtpTransporter().sendMail({
      from: getFrom(),
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return;
  }
  throw new Error("Nessun provider email configurato (RESEND_API_KEY oppure SMTP_*).");
}

/**
 * Invia più email diverse senza mai lanciare eccezioni: il chiamante riceve l'elenco
 * dei fallimenti e decide cosa farne. Con Resend usa l'endpoint batch (una sola
 * richiesta, niente limite di frequenza); se il batch viene rifiutato (basta un
 * indirizzo non valido) ripiega sull'invio singolo, così un destinatario sbagliato
 * non blocca gli altri.
 */
export async function sendEmails(messages: OutgoingEmail[]) {
  const failed: { to: string; error: string }[] = [];
  let sent = 0;

  const sendOneByOne = async (items: OutgoingEmail[]) => {
    for (const message of items) {
      try {
        await sendEmail(message);
        sent += 1;
      } catch (error) {
        failed.push({ to: message.to, error: error instanceof Error ? error.message : String(error) });
      }
    }
  };

  if (hasResend()) {
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      try {
        const response = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: RESEND_HEADERS(),
          body: JSON.stringify(
            chunk.map((m) => ({ from: getFrom(), to: m.to, subject: m.subject, html: m.html }))
          ),
        });
        if (response.ok) {
          sent += chunk.length;
          continue;
        }
      } catch {
        // rete o risposta anomala: si ripiega sull'invio singolo qui sotto
      }
      await sendOneByOne(chunk);
    }
  } else {
    await sendOneByOne(messages);
  }

  return { sent, failed };
}
