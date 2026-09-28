"use client";

import { useActionState } from "react";
import { requestLoginAction, type LoginState } from "./actions";
import { Label, PrimaryButton } from "@/components/ui";

const initialState: LoginState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(requestLoginAction, initialState);

  if (state.status === "sent") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-good-bg px-4 py-3 text-sm text-good">
          Se l&apos;indirizzo è registrato, ti abbiamo inviato un link di accesso valido 15
          minuti.
        </div>
        {state.devLoginUrl && (
          <div className="rounded-lg border border-line bg-paper-raised p-4 text-sm">
            <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-ink-soft">
              Modalità sviluppo — nessuna email è stata inviata davvero
            </p>
            <a
              href={state.devLoginUrl}
              className="break-all font-mono text-[12.5px] text-navy underline"
            >
              {state.devLoginUrl}
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label>Email</Label>
        <input
          type="email"
          name="email"
          required
          placeholder="nome.cognome@azienda.it"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-navy-soft"
        />
      </div>
      {state.status === "error" && (
        <div className="rounded-lg bg-bad-bg px-3 py-2 text-[13px] text-bad">
          {state.message}
        </div>
      )}
      <PrimaryButton type="submit" disabled={pending} className="w-full">
        {pending ? "Invio in corso…" : "Invia link di accesso"}
      </PrimaryButton>
    </form>
  );
}
