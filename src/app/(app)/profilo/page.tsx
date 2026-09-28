import { requireMember, displayName } from "@/lib/auth";
import { Avatar, Pill, Callout, PrimaryButton, GhostButton } from "@/components/ui";
import { connectSignatureAction, disconnectSignatureAction } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Amministratore",
  BOARD: "Consiglio di Amministrazione",
  STAFF: "Staff",
};

export default async function ProfiloPage() {
  const member = await requireMember();

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="font-display text-[22px] font-semibold">Profilo</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">I tuoi dati e le impostazioni del tuo account.</p>
      </div>

      <div className="rounded-2xl border border-line bg-paper-raised p-5">
        <div className="flex items-center gap-3.5">
          <Avatar name={displayName(member)} color={member.color} size={44} />
          <div>
            <div className="font-display text-[17px] font-semibold">{displayName(member)}</div>
            <div className="text-[12.5px] text-ink-soft">{member.email}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill tone={member.role === "STAFF" ? "staff" : "approved"}>
            {ROLE_LABEL[member.role]}
          </Pill>
          {member.isPresident && <Pill tone="pending">Presidente del CdA</Pill>}
        </div>
        <div className="mt-3 text-[13px] text-ink-soft">{member.jobTitle}</div>
      </div>

      {member.isPresident && (
        <div className="rounded-2xl border border-line bg-paper-raised p-5">
          <h2 className="mb-1 text-[12px] font-bold uppercase tracking-wide text-ink-soft">
            Firma elettronica
          </h2>
          <p className="mb-4 text-[13px] text-ink-soft">
            In quanto Presidente sei l&apos;unico account a cui viene chiesto di collegare una
            firma elettronica: servirà a firmare i verbali ufficiali generati automaticamente
            ogni 30 giorni.
          </p>

          {member.signatureConnectedAt ? (
            <>
              <Callout tone="gold" title="Firma collegata (modalità dimostrativa)">
                Provider: <b>{member.signatureProvider}</b> · collegata il{" "}
                {new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeStyle: "short" }).format(
                  member.signatureConnectedAt
                )}
                .
              </Callout>
              <form action={disconnectSignatureAction} className="mt-4">
                <GhostButton type="submit">Scollega firma</GhostButton>
              </form>
            </>
          ) : (
            <>
              <Callout tone="staff" title="Nessun provider ancora integrato">
                Questa è una predisposizione: il collegamento qui sotto simula l&apos;esito di
                un futuro flusso reale verso un provider di firma qualificata (es. InfoCert,
                Aruba, Namirial). Nessun dato di firma reale viene creato o richiesto.
              </Callout>
              <form action={connectSignatureAction} className="mt-4">
                <PrimaryButton type="submit">Collega la tua firma elettronica</PrimaryButton>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
