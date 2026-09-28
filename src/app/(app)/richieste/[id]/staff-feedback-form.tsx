"use client";

import { useActionState } from "react";
import { castStaffFeedbackAction, type FeedbackState } from "./actions";
import { Label, Callout, FieldHint } from "@/components/ui";

const initialState: FeedbackState = { status: "idle" };

export function StaffFeedbackForm({ proposalId }: { proposalId: string }) {
  const [state, formAction, pending] = useActionState(castStaffFeedbackAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="proposalId" value={proposalId} />
      <FieldHint>
        Il tuo parere è consultivo: aiuta il Consiglio a decidere, ma non viene conteggiato come
        voto.
      </FieldHint>
      <div>
        <Label>Il tuo commento</Label>
        <textarea
          name="comment"
          rows={3}
          placeholder="Condividi la tua valutazione sull'argomento…"
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
          name="preference"
          value="NEGATIVE"
          disabled={pending}
          className="flex-1 rounded-lg bg-bad py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          👎 Parere negativo
        </button>
        <button
          type="submit"
          name="preference"
          value="POSITIVE"
          disabled={pending}
          className="flex-1 rounded-lg bg-good py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          👍 Parere positivo
        </button>
      </div>
    </form>
  );
}
