import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui";

export default async function MinutesEmailPage({ params }: PageProps<"/verbali/[id]/email">) {
  const { id } = await params;
  const member = await requireMember();
  if (member.role !== "ADMIN") redirect(`/verbali/${id}`);

  const minutes = await prisma.minutes.findUnique({ where: { id } });
  if (!minutes || minutes.organizationId !== member.organizationId) notFound();

  const notifications = await prisma.minutesNotification.findMany({
    where: { minutesId: id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-4 pb-10">
      <Link href={`/verbali/${id}`} className="text-[12.5px] font-semibold text-navy-soft">
        ← Torna al verbale
      </Link>
      <div>
        <h1 className="font-display text-[20px] font-semibold">Email inviata al Consiglio</h1>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">
          Notifica generata automaticamente alla creazione del verbale periodico.
        </p>
      </div>

      {notifications.length === 0 ? (
        <EmptyState>Nessuna notifica registrata per questo verbale.</EmptyState>
      ) : (
        <>
          <div className="rounded-t-lg border border-b-0 border-line bg-paper px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft">
            <div>
              <b className="text-ink">Da:</b> CdaDecisor &lt;notifiche@azienda.it&gt;
            </div>
            <div>
              <b className="text-ink">A:</b> {notifications.length} membri del Consiglio
            </div>
            <div>
              <b className="text-ink">Oggetto:</b> {notifications[0].subject}
            </div>
          </div>
          <div className="overflow-hidden rounded-b-lg border border-line">
            <iframe
              sandbox=""
              srcDoc={notifications[0].htmlBody}
              className="h-[600px] w-full border-0 bg-white"
              title="Anteprima email"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {notifications.map((n) => (
              <span
                key={n.id}
                className="rounded-full border border-line bg-paper-raised px-3 py-1 text-xs"
              >
                {n.toName}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
