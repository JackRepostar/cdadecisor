"use client";

import { useActionState } from "react";
import { createProposalAction, type NewProposalState } from "./actions";
import { Label, FieldHint, PrimaryButton, Callout, Avatar } from "@/components/ui";
import { displayName } from "@/lib/member-format";
import type { Member } from "@prisma/client";

const initialState: NewProposalState = { status: "idle" };

export function NewProposalForm({
  isAdmin,
  boardOptions,
  staffOptions,
}: {
  isAdmin: boolean;
  boardOptions: Member[];
  staffOptions: Member[];
}) {
  const [state, formAction, pending] = useActionState(createProposalAction, initialState);

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-line bg-paper-raised p-5">
      {isAdmin && (
        <div>
          <Label>Crea per conto di</Label>
          <select
            name="authorId"
            required
            className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-navy-soft"
          >
            <option value="">Seleziona un consigliere…</option>
            {boardOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {displayName(m)} — {m.jobTitle}
              </option>
            ))}
          </select>
          <FieldHint>
            Come amministratore puoi inserire una richiesta per conto di un membro del
            Consiglio, ma non potrai votarla: il voto resta riservato ai consiglieri.
          </FieldHint>
        </div>
      )}

      <div>
        <Label>Oggetto della richiesta</Label>
        <input
          type="text"
          name="title"
          required
          placeholder="Es. Approvazione budget marketing Q4"
          className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-navy-soft"
        />
      </div>

      <div>
        <Label>Dettaglio e motivazione</Label>
        <textarea
          name="description"
          required
          rows={6}
          placeholder="Descrivi il contesto, l'importo o l'azione richiesta e perché il Consiglio dovrebbe approvarla."
          className="w-full resize-y rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-navy-soft"
        />
        <FieldHint>Questo testo sarà visibile a tutti i consiglieri prima del voto.</FieldHint>
      </div>

      <div>
        <Label>Allegati (facoltativi)</Label>
        <input
          type="file"
          name="attachments"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          className="w-full rounded-lg border border-dashed border-line bg-paper px-3 py-2.5 text-[12.5px] text-ink-soft"
        />
        <FieldHint>PDF, Word, Excel o immagini · max 5MB per file.</FieldHint>
      </div>

      {staffOptions.length > 0 && (
        <div>
          <Label>Coinvolgi membri dello staff (facoltativo)</Label>
          <div className="space-y-1.5">
            {staffOptions.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-paper px-2.5 py-2 text-[13px]"
              >
                <input type="checkbox" name="staffIds" value={s.id} className="accent-navy" />
                <Avatar name={displayName(s)} color={s.color} size={22} />
                <span>
                  {displayName(s)}{" "}
                  <span className="text-[11.5px] text-ink-soft">· {s.jobTitle}</span>
                </span>
              </label>
            ))}
          </div>
          <FieldHint>
            Lo staff può leggere la richiesta, lasciare un commento ed esprimere un parere
            positivo o negativo, ma non è un voto del Consiglio.
          </FieldHint>
        </div>
      )}

      {state.status === "error" && (
        <Callout tone="bad" title="Attenzione">
          {state.message}
        </Callout>
      )}

      <PrimaryButton type="submit" disabled={pending} className="w-full">
        {pending ? "Invio in corso…" : "Invia al Consiglio"}
      </PrimaryButton>
    </form>
  );
}
