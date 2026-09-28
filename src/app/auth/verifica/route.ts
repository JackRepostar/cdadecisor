import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLinkToken } from "@/lib/magic-link";
import { createSessionCookie } from "@/lib/session";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const baseUrl = request.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(new URL("/login?errore=link_mancante", baseUrl));
  }

  const result = await verifyMagicLinkToken(token);

  if (result.status !== "ok") {
    const reason =
      result.status === "expired"
        ? "link_scaduto"
        : result.status === "used"
          ? "link_usato"
          : "link_non_valido";
    return NextResponse.redirect(new URL(`/login?errore=${reason}`, baseUrl));
  }

  await createSessionCookie(result.memberId);
  return NextResponse.redirect(new URL("/", baseUrl));
}
