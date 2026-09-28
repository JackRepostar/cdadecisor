import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformMagicLinkToken, createPlatformSessionCookie } from "@/lib/platform-auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const baseUrl = request.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(new URL("/quitebold/login?errore=link_mancante", baseUrl));
  }

  const result = await verifyPlatformMagicLinkToken(token);
  if (result.status !== "ok") {
    const reason =
      result.status === "expired" ? "link_scaduto" : result.status === "used" ? "link_usato" : "link_non_valido";
    return NextResponse.redirect(new URL(`/quitebold/login?errore=${reason}`, baseUrl));
  }

  await createPlatformSessionCookie(result.platformAdminId);
  return NextResponse.redirect(new URL("/quitebold/organizzazioni", baseUrl));
}
