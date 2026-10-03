import "server-only";
import { cache } from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendRecapForOrganization } from "@/lib/notifications";
import { zonedTodayAt, zonedDateKey } from "@/lib/timezone";
import { addCivilDays, civilDateOf, isWorkingCivilDate, isWorkingDay } from "@/lib/calendar-it";

// Ora locale (fuso Europa/Roma, non quello del server) dopo la quale le richieste
// accumulate nella giornata vengono pubblicate tutte insieme al Consiglio (non in
// tempo reale) e parte il recap giornaliero.
const PUBLISH_HOUR = 15;

/**
 * Testo da mostrare a chi ha appena creato una richiesta: quando diventerà visibile.
 * Il sabato, la domenica e i festivi non si pubblica: si indica il prossimo giorno
 * lavorativo (es. "lunedì 5 ottobre alle 15:00").
 */
export function describeNextPublish(now: Date = new Date()) {
  const today = civilDateOf(now);
  let offset = isWorkingCivilDate(today) && now < zonedTodayAt(PUBLISH_HOUR, now) ? 0 : 1;
  while (offset < 30 && !isWorkingCivilDate(addCivilDays(today, offset))) offset += 1;

  if (offset === 0) return `oggi alle ${PUBLISH_HOUR}:00`;
  if (offset === 1) return `domani alle ${PUBLISH_HOUR}:00`;
  const target = addCivilDays(today, offset);
  const label = new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(target.year, target.month - 1, target.day)));
  return `${label} alle ${PUBLISH_HOUR}:00`;
}

async function runDailyRecapForOrganization(organizationId: string, day: string, now: Date) {
  // Un'azienda senza alcuna richiesta (nemmeno in bozza) non ha nulla da comunicare.
  if ((await prisma.proposal.count({ where: { organizationId } })) === 0) return;

  // "Conquista" la giornata: la chiave unica (azienda, giorno) fa vincere una sola
  // esecuzione se cron e visite al sito arrivano insieme; le altre non fanno nulla.
  let run;
  try {
    run = await prisma.recapRun.create({ data: { organizationId, day } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }

  const drafts = await prisma.proposal.findMany({
    where: { organizationId, status: "DRAFT" },
    select: { id: true },
  });
  const published = drafts.length
    ? await prisma.proposal.updateManyAndReturn({
        where: { id: { in: drafts.map((d) => d.id) }, status: "DRAFT" },
        data: { status: "OPEN", publishedAt: now },
        select: { id: true },
      })
    : [];

  // Un errore nell'invio non deve mai annullare né bloccare la pubblicazione.
  try {
    const result = await sendRecapForOrganization(
      organizationId,
      published.map((p) => p.id)
    );
    await prisma.recapRun.update({
      where: { id: run.id },
      data: {
        published: published.length,
        recipients: result.recipients,
        sent: result.sent,
        failed: result.failed,
        error: result.firstError,
      },
    });
  } catch (error) {
    console.error("Invio del recap fallito:", error);
    await prisma.recapRun.update({
      where: { id: run.id },
      data: {
        published: published.length,
        error: (error instanceof Error ? error.message : String(error)).slice(0, 300),
      },
    });
  }
}

/**
 * Da chiamare una volta per richiesta (layout dell'area autenticata) e dal cron.
 * Nei giorni lavorativi, dopo le 15:00 (fuso Europa/Roma), per ogni azienda che oggi
 * non ha ancora avuto il suo recap: pubblica in blocco le richieste ancora in bozza e invia a ogni consigliere
 * e membro dello staff il recap giornaliero. Le richieste create dopo le 15:00 restano
 * in coda per domani, anche se qualcuno visita il sito nel frattempo. Trigger: la
 * chiamata del cron (vedi /api/cron/tick e vercel.json) oppure il primo accesso dopo
 * le 15:00, così tutto parte anche senza visite.
 */
export const publishDueProposals = cache(async () => {
  const now = new Date();
  // Sabato, domenica e festivi non si pubblica e non si invia nulla: le richieste
  // restano in coda per il primo giorno lavorativo successivo.
  if (!isWorkingDay(now)) return;
  if (now < zonedTodayAt(PUBLISH_HOUR, now)) return;

  const day = zonedDateKey(now);
  const organizations = await prisma.organization.findMany({
    where: { recapRuns: { none: { day } } },
    select: { id: true },
  });
  if (organizations.length === 0) return;

  for (const { id } of organizations) {
    await runDailyRecapForOrganization(id, day, now);
  }

  // Pulizia: i link di accesso scaduti da oltre una settimana non servono più.
  await prisma.magicLinkToken.deleteMany({
    where: { expiresAt: { lt: new Date(now.getTime() - 7 * 24 * 3600_000) } },
  });
});
