import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberRow } from "./member-row";
import { AddMemberForm } from "./add-member-form";
import { EmptyState } from "@/components/ui";
import { FREE_BOARD_SEATS, FREE_STAFF_SEATS, hasFullAccess } from "@/lib/entitlements";

export default async function GestioneMembriPage() {
  const admin = await requireAdmin();

  const [boardMembers, staffMembers, fullAccess] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId: admin.organizationId, role: "BOARD", deletedAt: null },
      orderBy: { firstName: "asc" },
    }),
    prisma.member.findMany({
      where: { organizationId: admin.organizationId, role: "STAFF", deletedAt: null },
      orderBy: { firstName: "asc" },
    }),
    hasFullAccess(admin.organizationId),
  ]);

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="font-display text-[22px] font-semibold">Gestione membri</h1>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          Valida l&apos;email dei consiglieri, modifica i dati di un membro o rimuovilo: lo
          storico resta sempre consultabile.
        </p>
      </div>

      <section className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
            Consiglio di Amministrazione
          </h2>
          {!fullAccess && (
            <span className="text-[11px] text-ink-soft">
              {boardMembers.length}/{FREE_BOARD_SEATS} gratuiti
            </span>
          )}
        </div>
        {boardMembers.length === 0 ? (
          <EmptyState>Nessun membro del CdA.</EmptyState>
        ) : (
          boardMembers.map((m) => (
            <MemberRow key={`${m.id}-${m.updatedAt.toISOString()}`} member={m} />
          ))
        )}
      </section>

      <section className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Staff</h2>
          {!fullAccess && (
            <span className="text-[11px] text-ink-soft">
              {staffMembers.length}/{FREE_STAFF_SEATS} gratuiti
            </span>
          )}
        </div>
        {staffMembers.length === 0 ? (
          <EmptyState>Nessun membro dello staff.</EmptyState>
        ) : (
          staffMembers.map((m) => (
            <MemberRow key={`${m.id}-${m.updatedAt.toISOString()}`} member={m} />
          ))
        )}
      </section>

      <AddMemberForm />
    </div>
  );
}
