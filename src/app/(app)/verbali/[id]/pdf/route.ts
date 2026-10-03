import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMember, displayName } from "@/lib/auth";
import { renderMinutesPdf } from "@/lib/minutes-pdf";
import type { MinutesSnapshot } from "@/lib/minutes";
import { zonedDateKey } from "@/lib/timezone";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member) return new NextResponse("Non autorizzato", { status: 401 });
  if (member.role === "STAFF") return new NextResponse("Non autorizzato", { status: 403 });

  const { id } = await params;
  const minutes = await prisma.minutes.findUnique({ where: { id }, include: { signedBy: true } });
  if (!minutes || minutes.organizationId !== member.organizationId) {
    return new NextResponse("Non trovato", { status: 404 });
  }

  const [minutesNumber, organization, currentBoardMembers] = await Promise.all([
    prisma.minutes.count({
      where: { organizationId: member.organizationId, periodEnd: { lte: minutes.periodEnd } },
    }),
    prisma.organization.findUniqueOrThrow({ where: { id: member.organizationId } }),
    prisma.member.findMany({
      where: { organizationId: member.organizationId, role: "BOARD", deletedAt: null },
      orderBy: { firstName: "asc" },
    }),
  ]);

  const snapshot = minutes.snapshot as unknown as MinutesSnapshot;

  const pdfBuffer = await renderMinutesPdf({
    minutes,
    snapshot,
    company: organization,
    minutesNumber,
    currentBoardMembers: currentBoardMembers.map((m) => ({ name: displayName(m), jobTitle: m.jobTitle })),
  });

  const filename = `verbale-cda-${minutesNumber}-${zonedDateKey(minutes.periodEnd)}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
