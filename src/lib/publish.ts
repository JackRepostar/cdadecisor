import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { sendRecapForOrganization } from "@/lib/notifications";
import { zonedTodayAt, zonedStartOfDayUTC } from "@/lib/timezone";

// Ora locale (fuso Europa/Roma, non quello del server) dopo la quale le richieste
// accumulate nella giornata vengono pubblicate tutte insieme al Consiglio (non in
// tempo reale).
const PUBLISH_HOUR = 15;

/** Testo da mostrare a chi ha appena creato una richiesta: quando diventerà visibile. */
export function describeNextPublish(now: Date = new Date()) {
  const todayAt15 = zonedTodayAt(PUBLISH_HOUR, now);
  const isToday = now < todayAt15;
  return isToday
    ? `oggi alle ${PUBLISH_HOUR}:00`
    : `domani alle ${PUBLISH_HOUR}:00`;
}

/**
 * Da chiamare una volta per richiesta (layout dell'area autenticata). Implementa
 * la pubblicazione "in blocco una volta al giorno": dopo le 15:00, se il blocco
 * di oggi non è ancora partito, pubblica tutte le richieste ancora in bozza (e
 * invia/registra la relativa email) in un solo colpo. Le richieste create dopo
 * le 15:00 di oggi restano in coda per il blocco di domani, anche se qualcuno
 * visita il sito nel frattempo: usiamo `publishedAt` di oggi come prova che il
 * blocco odierno è già partito. Il trigger è il primo accesso all'app dopo le
 * 15:00 (fuso Europa/Roma) oppure la chiamata del cron (vedi /api/cron/tick e
 * vercel.json), così la pubblicazione e il recap partono anche senza visite.
 */
export const publishDueProposals = cache(async () => {
  const now = new Date();
  const publishThreshold = zonedTodayAt(PUBLISH_HOUR, now);
  if (now < publishThreshold) return;

  const startOfToday = zonedStartOfDayUTC(now);

  // Il blocco è per organizzazione: se oggi Azienda A ha già pubblicato non deve
  // impedire che Azienda B (che magari ha creato le sue bozze più tardi) pubblichi
  // a sua volta la prima volta che qualcuno visita l'app dopo le 15:00 di oggi.
  const draftOrgIds = await prisma.proposal.findMany({
    where: { status: "DRAFT" },
    select: { organizationId: true },
    distinct: ["organizationId"],
  });

  for (const { organizationId } of draftOrgIds) {
    const alreadyPublishedToday = await prisma.proposal.count({
      where: { organizationId, publishedAt: { gte: startOfToday } },
    });
    if (alreadyPublishedToday > 0) continue;

    const drafts = await prisma.proposal.findMany({
      where: { organizationId, status: "DRAFT" },
      select: { id: true },
    });
    if (drafts.length === 0) continue;

    // Pubblicazione atomica: se due richieste (cron e visita al sito) arrivano
    // insieme, solo una "conquista" le bozze e invia il recap; l'altra trova zero righe.
    const published = await prisma.proposal.updateManyAndReturn({
      where: { id: { in: drafts.map((d) => d.id) }, status: "DRAFT" },
      data: { status: "OPEN", publishedAt: now },
      select: { id: true },
    });
    if (published.length === 0) continue;

    // Un errore nell'invio del recap non deve mai annullare né bloccare la pubblicazione.
    try {
      await sendRecapForOrganization(
        organizationId,
        published.map((p) => p.id)
      );
    } catch (error) {
      console.error("Invio del recap fallito:", error);
    }
  }
});
