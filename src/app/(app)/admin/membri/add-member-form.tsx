"use client";

import { useActionState } from "react";
import { addMemberAction, type MemberFormState } from "./actions";
import { Label, FieldHint, PrimaryButton, Callout } from "@/components/ui";

const initialState: MemberFormState = { status: "idle" };

export function AddMemberForm() {
  const [state, formAction, pending] = useActionState(addMemberAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-line bg-paper-raised p-5">
      <h3 className="text-[12px] font-bold uppercase tracking-wide text-ink-soft">
        Aggiungi un membro
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Nome</Label>
          <input
            type="text"
            name="firstName"
            required
            placeholder="Es. Paolo"
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy-soft"
          />
        </div>
        <div>
          <Label>Cognome</Label>
          <input
            type="text"
            name="lastName"
            required
            placeholder="Es. Greco"
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy-soft"
          />
        </div>
      </div>
      <div>
        <Label>Email</Label>
        <input
          type="email"
          name="email"
          required
          placeholder="paolo.greco@azienda.it"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy-soft"
        />
      </div>
      <div>
        <Label>Ruolo</Label>
        <input
          type="text"
          name="jobTitle"
          placeholder="Es. Consigliere, Consulente esterno…"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy-soft"
        />
      </div>
      <div>
        <Label>Tipo di account</Label>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="radio" name="kind" value="BOARD" defaultChecked className="accent-navy" />
            Membro del CdA (vota)
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="kind" value="STAFF" className="accent-navy" />
            Staff (parere consultivo)
          </label>
        </div>
        <FieldHint>
          I membri del CdA richiedono la validazione email; lo staff, aggiunto direttamente da
          te, è subito attivo e può usare anche un&apos;email esterna.
        </FieldHint>
      </div>
      {state.status === "error" && (
        <Callout tone="bad" title="Attenzione">
          {state.message}
        </Callout>
      )}
      <PrimaryButton type="submit" disabled={pending} className="w-full">
        {pending ? "Aggiungo…" : "Aggiungi membro"}
      </PrimaryButton>
    </form>
  );
}
