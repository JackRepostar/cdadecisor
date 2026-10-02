import { NextResponse } from "next/server";
import { publishDueProposals } from "@/lib/publish";
import { ensureMinutesGeneration } from "@/lib/minutes";

// Non va mai messo in cache: deve rivalutare lo stato del database ad ogni chiamata.
export const dynamic = "force-dynamic";
// Il recap può dover inviare molte email: margine ampio rispetto al default.
export const maxDuration = 60;

/**
 * Endpoint per il cron, non per essere visitato da persone. Su Vercel lo chiama
 * vercel.json (due esecuzioni al giorno, alle 13:00 e 14:00 UTC: quella che cade
 * dopo le 15:00 ora di Roma pubblica, l'altra non trova nulla da fare, così l'ora
 * legale/solare non richiede modifiche). Vercel invia da solo l'header
 * "Authorization: Bearer $CRON_SECRET". Altrove basta un crontab:
 *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://TUO-DOMINIO/api/cron/tick
 * In ogni caso la stessa logica scatta anche ad ogni pagina caricata dopo le 15:00
 * (vedi src/app/(app)/layout.tsx).
 */
function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function runTick() {
  await publishDueProposals();
  await ensureMinutesGeneration();
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString() });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return new NextResponse("Non autorizzato", { status: 401 });
  return runTick();
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return new NextResponse("Non autorizzato", { status: 401 });
  return runTick();
}
