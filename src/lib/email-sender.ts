import "server-only";

/**
 * Unico punto di invio email reale dell'applicativo, tramite l'API HTTP di Resend
 * (nessuna SDK aggiuntiva). Attivo automaticamente non appena RESEND_API_KEY è
 * impostata nell'ambiente: fino ad allora chi chiama questa funzione deve restare
 * dietro un controllo `isEmailSendingEnabled()`, così in sviluppo l'app continua a
 * registrare soltanto le email senza spedirle.
 */
export function isEmailSendingEnabled() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(params: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY non configurata: invio email reale non disponibile.");
  }
  const from = process.env.EMAIL_FROM || "CdaDecisor <notifiche@quitebold.com>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Invio email a ${params.to} fallito (${response.status}): ${body}`);
  }
}
