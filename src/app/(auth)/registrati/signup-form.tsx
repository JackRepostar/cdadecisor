"use client";

import { useActionState } from "react";
import { signupAction, type SignupState } from "./actions";
import { Label, PrimaryButton } from "@/components/ui";

const initialState: SignupState = { status: "idle" };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  if (state.status === "created") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-good-bg px-4 py-3 text-sm text-good">
          Organizzazione creata. Ti abbiamo inviato un link di accesso valido 15 minuti.
        </div>
        {state.devLoginUrl && (
          <div className="rounded-lg border border-line bg-paper-raised p-4 text-sm">
            <p className="mb-2 font-bold uppercase tracking-wide text-[11px] text-ink-soft">
              Modalità sviluppo — nessuna email è stata inviata davvero
            </p>
            <a href={state.devLoginUrl} className="break-all font-mono text-[12.5px] text-navy underline">
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
        <Label>Nome dell&apos;azienda</Label>
        <input
          type="text"
          name="companyName"
          required
          placeholder="Acme Industrie S.p.A."
          className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-navy-soft"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Nome</Label>
          <input
            type="text"
            name="firstName"
            required
            className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-navy-soft"
          />
        </div>
        <div>
          <Label>Cognome</Label>
          <input
            type="text"
            name="lastName"
            required
            className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-navy-soft"
          />
        </div>
      </div>
      <div>
        <Label>La tua email di lavoro</Label>
        <input
          type="email"
          name="email"
          required
          placeholder="nome.cognome@azienda.it"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-navy-soft"
        />
      </div>
      {state.status === "error" && (
        <div className="rounded-lg bg-bad-bg px-3 py-2 text-[13px] text-bad">{state.message}</div>
      )}
      <PrimaryButton type="submit" disabled={pending} className="w-full">
        {pending ? "Creazione in corso…" : "Crea la tua organizzazione"}
      </PrimaryButton>
      <p className="text-center text-[12px] text-ink-soft">
        Diventerai l&apos;Amministratore della tua azienda su CdaDecisor: 2 posti CdA gratuiti e
        fino a 5 membri dello staff inclusi.
      </p>
    </form>
  );
}
