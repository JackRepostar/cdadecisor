"use server";

import { requestPlatformMagicLink } from "@/lib/platform-auth";

export type PlatformLoginState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "sent"; devLoginUrl: string | null };

export async function requestPlatformLoginAction(
  _prevState: PlatformLoginState,
  formData: FormData
): Promise<PlatformLoginState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { status: "error", message: "Inserisci il tuo indirizzo email." };

  const result = await requestPlatformMagicLink(email);
  if (result.status === "not_found") {
    return { status: "error", message: "Questo indirizzo non è abilitato al pannello Quitebold." };
  }
  return { status: "sent", devLoginUrl: result.devLoginUrl };
}
