import { requireMember, displayName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishDueProposals } from "@/lib/publish";
import { ensureMinutesGeneration } from "@/lib/minutes";
import { TopNav } from "@/components/top-nav";
import type { Route } from "next";

async function getNavItems(member: Awaited<ReturnType<typeof requireMember>>) {
  if (member.role === "ADMIN") {
    const pendingCount = await prisma.member.count({
      where: { organizationId: member.organizationId, role: "BOARD", status: "PENDING", deletedAt: null },
    });
    return [
      { href: "/richieste/nuova" as Route, label: "Nuova richiesta" },
      { href: "/registro" as Route, label: "Registro" },
      { href: "/verbali" as Route, label: "Verbali" },
      { href: "/admin/membri" as Route, label: "Gestione membri", badge: pendingCount },
      { href: "/admin/impostazioni" as Route, label: "Impostazioni" },
    ];
  }

  if (member.role === "STAFF") {
    const assignedOpen = await prisma.staffAssignment.count({
      where: { memberId: member.id, proposal: { status: "OPEN" } },
    });
    return [{ href: "/assegnate" as Route, label: "Richieste assegnate", badge: assignedOpen }];
  }

  const [openCount, unsignedMinutesCount] = await Promise.all([
    prisma.proposal.count({ where: { organizationId: member.organizationId, status: "OPEN" } }),
    member.isPresident
      ? prisma.minutes.count({ where: { organizationId: member.organizationId, signedAt: null } })
      : Promise.resolve(0),
  ]);
  return [
    { href: "/richieste" as Route, label: "In votazione", badge: openCount },
    { href: "/richieste/nuova" as Route, label: "Nuova richiesta" },
    { href: "/registro" as Route, label: "Registro" },
    { href: "/verbali" as Route, label: "Verbali", badge: unsignedMinutesCount || null },
  ];
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember();
  await publishDueProposals();
  await ensureMinutesGeneration();
  const navItems = await getNavItems(member);

  return (
    <div className="flex-1 pb-24">
      <TopNav
        memberName={displayName(member)}
        memberColor={member.color}
        navItems={navItems}
      />
      <div className="mx-auto w-full max-w-3xl px-4">{children}</div>
    </div>
  );
}
