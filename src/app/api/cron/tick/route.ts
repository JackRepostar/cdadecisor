import { NextResponse } from "next/server";
import { publishDueProposals } from "@/lib/publish";
import { ensureMinutesGeneration } from "@/lib/minutes";

// Non va mai messo in cache: deve rivalutare lo stato del database ad ogni chiamata.
export const dynamic = "force-dynamic";

/**
 * Endpoint pensato per un cron esterno del server (crontab, systemd timer...), non
 * per essere visitato da persone. In sviluppo/locale non serve: la stessa logica
 * scatta già ad ogni pagina caricata (vedi src/app/(app)/layout.tsx). In produzione,
 * se l'app può restare senza visite per ore, un cron che chiami questo endpoint
 * ogni 10-15 minuti garantisce comunque la pubblicazione delle 15:00 e i verbali
 * periodici puntuali. Esempio crontab (ogni 15 minuti):
 *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://TUO-DOMINIO/api/cron/tick
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
