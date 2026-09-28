import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";

export default async function ImpostazioniPage() {
  const admin = await requireAdmin();
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: admin.organizationId } });

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1 className="font-display text-[22px] font-semibold">Impostazioni societarie</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          Dati usati nell&apos;intestazione ufficiale del PDF dei verbali del Consiglio.
        </p>
      </div>
      <SettingsForm organization={organization} />
    </div>
  );
}
