"use client";

import { useActionState } from "react";
import { updateCompanySettingsAction, type SettingsFormState } from "./actions";
import { Label, FieldHint, PrimaryButton, Callout } from "@/components/ui";
import type { Organization } from "@prisma/client";

const initialState: SettingsFormState = { status: "idle" };

export function SettingsForm({ organization }: { organization: Organization }) {
  const [state, formAction, pending] = useActionState(updateCompanySettingsAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-line bg-paper-raised p-5">
      <div>
        <Label>Ragione sociale</Label>
        <input
          type="text"
          name="companyName"
          defaultValue={organization.name}
          required
          placeholder="Es. Acme Industrie S.p.A."
          className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-navy-soft"
        />
      </div>
      <div>
        <Label>Forma giuridica</Label>
        <input
          type="text"
          name="legalForm"
          defaultValue={organization.legalForm}
          required
          placeholder="Es. Società per Azioni"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-navy-soft"
        />
      </div>
      <div>
        <Label>Sede legale</Label>
        <input
          type="text"
          name="registeredOffice"
          defaultValue={organization.registeredOffice}
          required
          placeholder="Via Roma 1, 20100 Milano (MI)"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-navy-soft"
        />
      </div>
      <div>
        <Label>Codice fiscale / Partita IVA</Label>
        <input
          type="text"
          name="taxId"
          defaultValue={organization.taxId}
          placeholder="IT00000000000"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-navy-soft"
        />
        <FieldHint>Questi dati compaiono nell&apos;intestazione del PDF ufficiale dei verbali.</FieldHint>
      </div>
      {state.status === "error" && (
        <Callout tone="bad" title="Attenzione">
          {state.message}
        </Callout>
      )}
      {state.status === "saved" && (
        <Callout tone="gold" title="Salvato">
          I dati societari sono stati aggiornati.
        </Callout>
      )}
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Salvo…" : "Salva"}
      </PrimaryButton>
    </form>
  );
}
