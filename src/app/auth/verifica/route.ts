import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLinkToken } from "@/lib/magic-link";
import { createSessionCookie } from "@/lib/session";

// I token sono base64url: restringere il formato impedisce anche qualunque
// iniezione di HTML quando il valore viene riportato nella pagina di passaggio.
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{20,100}$/;

function redirectToLogin(request: NextRequest, reason: string) {
  return NextResponse.redirect(new URL(`/login?errore=${reason}`, request.nextUrl.origin), 303);
}

/**
 * Aprire il link NON consuma il token: serve una richiesta POST. Gli antivirus e i
 * filtri link delle aziende (Safe Links, ecc.) visitano in anticipo gli URL delle
 * email con una GET: se bastasse quella, brucerebbero il link prima del destinatario.
 * La pagina invia il modulo da sola, quindi per una persona l'accesso resta diretto.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return redirectToLogin(request, "link_mancante");
  if (!TOKEN_FORMAT.test(token)) return redirectToLogin(request, "link_non_valido");

  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Accesso a CdaDecisor</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F7F5EF;font-family:Georgia,serif;color:#1C1F26}
.box{text-align:center;padding:24px}.logo{width:44px;height:44px;margin:0 auto 14px;border-radius:12px;background:#1B2A41;color:#F1E6C8;display:flex;align-items:center;justify-content:center;font-weight:600}
p{font-family:Arial,sans-serif;font-size:14px;color:#4A5164;margin:6px 0 18px}
button{background:#1B2A41;color:#F1E6C8;border:0;border-radius:8px;padding:12px 28px;font:700 14px Arial,sans-serif;cursor:pointer}</style></head>
<body><div class="box"><div class="logo">CdA</div><p>Accesso a CdaDecisor in corso…</p>
<form method="post" action="/auth/verifica"><input type="hidden" name="token" value="${token}">
<button type="submit">Entra</button></form></div>
<script>document.forms[0].submit();</script></body></html>`;

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    },
  });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  if (!token) return redirectToLogin(request, "link_mancante");
  if (!TOKEN_FORMAT.test(token)) return redirectToLogin(request, "link_non_valido");

  const result = await verifyMagicLinkToken(token);

  if (result.status !== "ok") {
    const reason =
      result.status === "expired"
        ? "link_scaduto"
        : result.status === "used"
          ? "link_usato"
          : "link_non_valido";
    return redirectToLogin(request, reason);
  }

  await createSessionCookie(result.memberId);
  return NextResponse.redirect(new URL("/", request.nextUrl.origin), 303);
}
