"use client";

import { useActionState } from "react";
import { castVoteAction, type VoteState } from "./actions";
import { Label, Callout } from "@/components/ui";

const initialState: VoteState = { status: "idle" };

export function VoteForm({ proposalId }: { proposalId: string }) {
  const [state, formAction, pending] = useActionState(castVoteAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="proposalId" value={proposalId} />
      <div>
        <Label>Motivazione del voto (facoltativa)</Label>
        <textarea
          name="motivation"
          rows={3}
          placeholder="Spiega brevemente la ragione del tuo voto…"
          className="w-full resize-y rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-navy-soft"
        />
      </div>
      {state.status === "error" && (
        <Callout tone="bad" title="Attenzione">
          {state.message}
        </Callout>
      )}
      <div className="flex gap-2.5">
        <button
          type="submit"
          name="choice"
          value="NO"
          disabled={pending}
          className="flex-1 rounded-lg bg-bad py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          ✕ Contrario
        </button>
        <button
          type="submit"
          name="choice"
          value="YES"
          disabled={pending}
          className="flex-1 rounded-lg bg-good py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          ✓ Favorevole
        </button>
      </div>
    </form>
  );
}
