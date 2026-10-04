import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Da quando una richiesta è "nuova" nell'app: dal penultimo recap in poi. Le richieste
 * pubblicate tra il penultimo e l'ultimo recap sono quelle che l'ultima email ha
 * segnato come nuove, e restano tali fino al recap successivo; quelle pubblicate dopo
 * l'ultimo recap non sono ancora state segnalate. Con meno di due recap, tutto è nuovo.
 */
export async function getNewSince(organizationId: string): Promise<Date> {
  const runs = await prisma.recapRun.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 2,
    select: { createdAt: true },
  });
  return runs.length >= 2 ? runs[1].createdAt : new Date(0);
}
