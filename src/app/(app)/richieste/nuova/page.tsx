import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewProposalForm } from "./new-proposal-form";
import { EmptyState } from "@/components/ui";

export default async function NuovaRichiestaPage() {
  const member = await requireMember();
  if (member.role === "STAFF") redirect("/assegnate");

  const isAdmin = member.role === "ADMIN";

  const [boardOptions, staffOptions] = await Promise.all([
    isAdmin
      ? prisma.member.findMany({
          where: { organizationId: member.organizationId, role: "BOARD", status: "VERIFIED", deletedAt: null },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
    prisma.member.findMany({
      where: { organizationId: member.organizationId, role: "STAFF", deletedAt: null },
      orderBy: { firstName: "asc" },
    }),
  ]);

  const blocked = !isAdmin && member.status !== "VERIFIED";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[22px] font-semibold">Sottoponi una richiesta</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {isAdmin
            ? "Crea una richiesta per conto di un membro del Consiglio: sarà subito visibile a tutti."
            : "Descrivi la proposta: sarà subito visibile ai membri del Consiglio, che la riceveranno anche via email nel recap dei giorni lavorativi."}
        </p>
      </div>

      {blocked ? (
        <EmptyState>
          Il tuo account è in attesa di validazione da parte dell&apos;amministratore. Potrai
          sottoporre richieste non appena la tua email aziendale sarà confermata.
        </EmptyState>
      ) : (
        <NewProposalForm isAdmin={isAdmin} boardOptions={boardOptions} staffOptions={staffOptions} />
      )}
    </div>
  );
}
