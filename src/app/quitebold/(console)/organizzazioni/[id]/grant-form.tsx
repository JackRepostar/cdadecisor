"use client";

import { useActionState } from "react";
import { grantAccessAction, type GrantFormState } from "./actions";
import { Label, PrimaryButton, Callout } from "@/components/ui";

const initialState: GrantFormState = { status: "idle" };

const DURATIONS: { value: string; label: string }[] = [
  { value: "ONE_MONTH", label: "1 mese" },
  { value: "THREE_MONTHS", label: "3 mesi" },
  { value: "SIX_MONTHS", label: "6 mesi" },
  { value: "TWELVE_MONTHS", label: "12 mesi" },
  { value: "LIFETIME", label: "Lifetime (nessuna scadenza)" },
];

export function GrantForm({ organizationId }: { organizationId: string }) {
  const [state, formAction, pending] = useActionState(grantAccessAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-line bg-paper-raised p-5">
      <input type="hidden" name="organizationId" value={organizationId} />
      <h3 className="text-[12px] font-bold uppercase tracking-wide text-ink-soft">
        Sblocca il software senza abbonamento
      </h3>
      <div>
        <Label>Durata</Label>
        <select
          name="duration"
          required
          defaultValue="ONE_MONTH"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-navy-soft"
        >
          {DURATIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Nota interna (facoltativa)</Label>
        <input
          type="text"
          name="note"
          placeholder="Es. cliente in prova, accordo commerciale…"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-navy-soft"
        />
      </div>
      {state.status === "error" && (
        <Callout tone="bad" title="Attenzione">
          {state.message}
        </Callout>
      )}
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Attivo…" : "Attiva sblocco"}
      </PrimaryButton>
    </form>
  );
}
