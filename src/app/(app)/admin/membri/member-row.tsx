"use client";

import { useActionState, useState } from "react";
import {
  updateMemberAction,
  verifyMemberAction,
  rejectMemberAction,
  deleteMemberAction,
  setPresidentAction,
  type MemberFormState,
} from "./actions";
import { Label, Pill, Callout, PrimaryButton, GhostButton, DangerButton } from "@/components/ui";
import { displayName } from "@/lib/member-format";
import type { Member } from "@prisma/client";

const initialState: MemberFormState = { status: "idle" };

export function MemberRow({ member }: { member: Member }) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");
  const [updateState, updateAction, updating] = useActionState(updateMemberAction, initialState);

  if (mode === "edit") {
    return (
      <form action={updateAction} className="space-y-3 rounded-2xl border border-line bg-paper-raised p-4">
        <input type="hidden" name="id" value={member.id} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Nome</Label>
            <input
              type="text"
              name="firstName"
              defaultValue={member.firstName}
              required
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy-soft"
            />
          </div>
          <div>
            <Label>Cognome</Label>
            <input
              type="text"
              name="lastName"
              defaultValue={member.lastName}
              required
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy-soft"
            />
          </div>
        </div>
        <div>
          <Label>Email</Label>
          <input
            type="email"
            name="email"
            defaultValue={member.email}
            required
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy-soft"
          />
        </div>
        <div>
          <Label>Ruolo</Label>
          <input
            type="text"
            name="jobTitle"
            defaultValue={member.jobTitle}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy-soft"
          />
        </div>
        <div>
          <Label>Tipo di account</Label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="kind"
                value="BOARD"
                defaultChecked={member.role === "BOARD"}
                className="accent-navy"
              />
              Membro del CdA
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="kind"
                value="STAFF"
                defaultChecked={member.role === "STAFF"}
                className="accent-navy"
              />
              Staff
            </label>
          </div>
        </div>
        {updateState.status === "error" && (
          <Callout tone="bad" title="Attenzione">
            {updateState.message}
          </Callout>
        )}
        <div className="flex gap-2.5">
          <GhostButton type="button" onClick={() => setMode("view")} className="flex-1">
            Annulla
          </GhostButton>
          <PrimaryButton type="submit" disabled={updating} className="flex-1">
            Salva modifiche
          </PrimaryButton>
        </div>
      </form>
    );
  }

  if (mode === "confirm-delete") {
    return (
      <div className="space-y-3 rounded-2xl border border-line bg-paper-raised p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-display text-[15px] font-semibold">{displayName(member)}</div>
            <div className="text-xs text-ink-soft">
              {member.jobTitle} · {member.email}
            </div>
          </div>
          <RoleBadge member={member} />
        </div>
        <div className="rounded-lg bg-bad-bg px-3 py-2.5 text-sm text-bad">
          Confermi l&apos;eliminazione di {displayName(member)}? Lo storico delle sue votazioni e
          dei suoi pareri resterà comunque visibile.
        </div>
        <div className="flex gap-2.5">
          <GhostButton type="button" onClick={() => setMode("view")} className="flex-1">
            Annulla
          </GhostButton>
          <form action={deleteMemberAction.bind(null, member.id)} className="flex-1">
            <DangerButton type="submit" className="w-full">
              Sì, elimina
            </DangerButton>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-paper-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-[15px] font-semibold">{displayName(member)}</div>
          <div className="text-xs text-ink-soft">
            {member.jobTitle} · {member.email}
          </div>
        </div>
        <div className="flex flex-none flex-col items-end gap-1.5">
          <RoleBadge member={member} />
          {member.isPresident && <Pill tone="pending">Presidente</Pill>}
        </div>
      </div>

      {member.role === "BOARD" && member.status === "VERIFIED" && !member.isPresident && (
        <form action={setPresidentAction.bind(null, member.id)}>
          <GhostButton type="submit" className="w-full">
            Imposta come Presidente del CdA
          </GhostButton>
        </form>
      )}

      {member.role === "BOARD" && member.status === "PENDING" && (
        <div className="flex gap-2.5">
          <form action={rejectMemberAction.bind(null, member.id)} className="flex-1">
            <DangerButton type="submit" className="w-full">
              Rifiuta
            </DangerButton>
          </form>
          <form action={verifyMemberAction.bind(null, member.id)} className="flex-1">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-good px-4 py-2.5 text-sm font-bold text-white"
            >
              Valida email
            </button>
          </form>
        </div>
      )}

      <div className="flex gap-2.5">
        <GhostButton type="button" onClick={() => setMode("edit")} className="flex-1">
          Modifica
        </GhostButton>
        <GhostButton
          type="button"
          onClick={() => setMode("confirm-delete")}
          className="flex-1 !text-bad"
        >
          Elimina
        </GhostButton>
      </div>
    </div>
  );
}

function RoleBadge({ member }: { member: Member }) {
  if (member.role === "STAFF") return <Pill tone="staff">Staff</Pill>;
  if (member.status === "VERIFIED") return <Pill tone="approved">Verificata</Pill>;
  if (member.status === "PENDING") return <Pill tone="pending">In attesa</Pill>;
  return <Pill tone="rejected">Rifiutata</Pill>;
}
