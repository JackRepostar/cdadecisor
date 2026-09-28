import "server-only";
import crypto from "node:crypto";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isEmailSendingEnabled, sendEmail } from "@/lib/email-sender";
import type { PlatformAdmin } from "@prisma/client";

// Sessione e login separati da quelli dei clienti: lo staff Quitebold non è un
// membro di nessuna organizzazione. Stesso pattern (cookie firmato + magic link)
// ma cookie/token dedicati, per non poter mai essere confusi con una sessione cliente.
const PLATFORM_SESSION_COOKIE = "cda_platform_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 giorni: uso interno, più frequente
const TOKEN_TTL_MINUTES = 15;

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET mancante o troppo corto: impostalo nel file .env");
  }
  return new TextEncoder().encode(secret);
}

export async function createPlatformSessionCookie(platformAdminId: string) {
  const token = await new SignJWT({ platformAdminId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(PLATFORM_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearPlatformSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(PLATFORM_SESSION_COOKIE);
}

async function readPlatformSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PLATFORM_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return typeof payload.platformAdminId === "string" ? payload.platformAdminId : null;
  } catch {
    return null;
  }
}

export const getCurrentPlatformAdmin = cache(async (): Promise<PlatformAdmin | null> => {
  const id = await readPlatformSessionId();
  if (!id) return null;
  return prisma.platformAdmin.findUnique({ where: { id } });
});

export async function requirePlatformAdmin(): Promise<PlatformAdmin> {
  const admin = await getCurrentPlatformAdmin();
  if (!admin) redirect("/quitebold/login");
  return admin;
}

export type PlatformMagicLinkResult =
  | { status: "not_found" }
  | { status: "sent"; devLoginUrl: string | null };

export async function requestPlatformMagicLink(rawEmail: string): Promise<PlatformMagicLinkResult> {
  const email = rawEmail.trim().toLowerCase();
  const admin = await prisma.platformAdmin.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!admin) return { status: "not_found" };

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000);
  await prisma.platformMagicLinkToken.create({ data: { token, platformAdminId: admin.id, expiresAt } });

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const loginUrl = `${baseUrl}/quitebold/auth/verifica?token=${token}`;

  if (isEmailSendingEnabled()) {
    await sendEmail({
      to: admin.email,
      subject: "Il tuo link di accesso al pannello Quitebold",
      html: `<p>Gentile ${admin.firstName},</p><p>Accedi al pannello Quitebold: <a href="${loginUrl}">${loginUrl}</a></p><p>Il link scade tra 15 minuti.</p>`,
    });
    return { status: "sent", devLoginUrl: null };
  }

  console.log(`\n✉️  [DEV] Link di accesso pannello Quitebold per ${admin.email}:\n${loginUrl}\n`);
  return { status: "sent", devLoginUrl: loginUrl };
}

export type PlatformVerifyResult =
  | { status: "ok"; platformAdminId: string }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "used" };

export async function verifyPlatformMagicLinkToken(token: string): Promise<PlatformVerifyResult> {
  const record = await prisma.platformMagicLinkToken.findUnique({ where: { token } });
  if (!record) return { status: "invalid" };
  if (record.usedAt) return { status: "used" };
  if (record.expiresAt < new Date()) return { status: "expired" };

  await prisma.platformMagicLinkToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return { status: "ok", platformAdminId: record.platformAdminId };
}
