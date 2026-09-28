import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Usato dal reverse proxy / dal monitoraggio del server per verificare che l'app
// e il database siano raggiungibili. Nessuna autenticazione: non espone dati.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "up" });
  } catch {
    return NextResponse.json({ ok: false, database: "down" }, { status: 503 });
  }
}
