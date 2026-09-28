import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMember } from "@/lib/auth";
import { readAttachmentFile } from "@/lib/attachments";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  if (!member) return new NextResponse("Non autorizzato", { status: 401 });

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { proposal: { include: { staffAssignments: true } } },
  });
  if (!attachment || attachment.proposal.organizationId !== member.organizationId) {
    return new NextResponse("Non trovato", { status: 404 });
  }

  if (member.role === "STAFF") {
    const allowed = attachment.proposal.staffAssignments.some((a) => a.memberId === member.id);
    if (!allowed) return new NextResponse("Non autorizzato", { status: 403 });
  }

  const buffer = await readAttachmentFile(attachment.storageKey);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.filename)}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
