"use client";

import { useActionState } from "react";
import { signMinutesAction, type SignMinutesState } from "../actions";
import { PrimaryButton, Callout } from "@/components/ui";

const initialState: SignMinutesState = { status: "idle" };

export function SignMinutesForm({ minutesId }: { minutesId: string }) {
  const [state, formAction, pending] = useActionState(signMinutesAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="minutesId" value={minutesId} />
      {state.status === "error" && (
        <Callout tone="bad" title="Attenzione">
          {state.message}
        </Callout>
      )}
      <PrimaryButton type="submit" disabled={pending} className="w-full">
        {pending ? "Firma in corso…" : "Firma il verbale"}
      </PrimaryButton>
    </form>
  );
}
