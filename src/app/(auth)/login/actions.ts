"use server";

import { requestMagicLink } from "@/lib/magic-link";

export type LoginState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "sent"; devLoginUrl: string | null };

export async function requestLoginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { status: "error", message: "Inserisci il tuo indirizzo email." };
  }

  const result = await requestMagicLink(email);

  if (result.status === "not_found") {
    return {
      status: "error",
      message:
        "Questo indirizzo non risulta registrato. Chiedi all'amministratore di aggiungerti come membro.",
    };
  }
  if (result.status === "rejected") {
    return {
      status: "error",
      message: "Il tuo accesso è stato rifiutato dall'amministratore.",
    };
  }

  return { status: "sent", devLoginUrl: result.devLoginUrl };
}
