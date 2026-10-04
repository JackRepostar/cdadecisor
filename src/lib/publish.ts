import "server-only";
import { cache } from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendRecapForOrganization } from "@/lib/notifications";
import { zonedTodayAt, zonedDateKey } from "@/lib/timezone";
import { addCivilDays, civilDateOf, isWorkingCivilDate, isWorkingDay } from "@/lib/calendar-it";

// Ora locale (fuso Europa/Roma, non quello del server) dopo la quale parte il recap
// giornaliero via email (nei giorni lavorativi). Le richieste, invece, sono visibili
// nell'app in tempo reale, appena create.
const PUBLISH_HOUR = 15;

/**
 * Quando parte il prossimo recap via email (le richieste sono già visibili nell'app).
 * Il sabato, la domenica e i festivi non parte nulla: si indica il prossimo giorno
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
    run = await prisma.recapRun.create({ data: { organizationId, day, createdAt: now } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }

  // Rete di sicurezza: le richieste nascono già pubblicate. Se ne restasse qualcuna in
  // bozza (ad esempio creata durante un aggiornamento del sito) la si pubblica qui.
  await prisma.proposal.updateMany({
    where: { organizationId, status: "DRAFT" },
    data: { status: "OPEN", publishedAt: now },
  });

  // Nuove = pubblicate dopo il recap precedente (o tutte, se è il primo).
  const previous = await prisma.recapRun.findFirst({
    where: { organizationId, createdAt: { lt: run.createdAt } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  // Un errore nell'invio non deve mai bloccare il resto.
  try {
    const result = await sendRecapForOrganization(organizationId, previous?.createdAt ?? new Date(0));
    await prisma.recapRun.update({
      where: { id: run.id },
      data: {
        published: result.newCount,
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
      data: { error: (error instanceof Error ? error.message : String(error)).slice(0, 300) },
    });
  }
}

/**
 * Da chiamare una volta per richiesta (layout dell'area autenticata) e dal cron.
 * Nei giorni lavorativi, dopo le 15:00 (fuso Europa/Roma), per ogni azienda che oggi
 * non ha ancora avuto il suo recap: invia a ogni consigliere e membro dello staff il
 * recap giornaliero. Trigger: la chiamata del cron (vedi /api/cron/tick e vercel.json)
 * oppure il primo accesso dopo le 15:00, così tutto parte anche senza visite.
 */
export const publishDueProposals = cache(async () => {
  const now = new Date();
  // Sabato, domenica e festivi non si invia nulla: il recap riprende il primo giorno
  // lavorativo successivo e comprende tutto ciò che è arrivato nel frattempo.
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
