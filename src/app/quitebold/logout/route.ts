import { NextRequest, NextResponse } from "next/server";
import { clearPlatformSessionCookie } from "@/lib/platform-auth";

export async function POST(request: NextRequest) {
  await clearPlatformSessionCookie();
  return NextResponse.redirect(new URL("/quitebold/login", request.nextUrl.origin));
}
