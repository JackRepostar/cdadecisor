import "server-only";

// I server di produzione (es. le funzioni serverless di Vercel) girano in UTC, non
// nel fuso orario italiano: usare Date.setHours()/getHours() per ragionare su "le
// 15:00" è quindi un bug che si manifesta solo in produzione. Questo modulo calcola
// data/ora usando esplicitamente il fuso dell'azienda, indipendentemente da dove
// gira il processo Node.
export const APP_TIMEZONE = "Europe/Rome";

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

/** L'ora corrente (0-23) nel fuso orario dell'app, a prescindere dal fuso del server. */
export function getZonedHour(date: Date = new Date(), timeZone: string = APP_TIMEZONE): number {
  return getZonedParts(date, timeZone).hour;
}

/**
 * Istante UTC corrispondente alla mezzanotte di oggi nel fuso indicato. Corregge
 * l'offset per iterazione: robusto per fusi con transizioni DST su ore intere
 * (incluso Europe/Rome).
 */
export function zonedStartOfDayUTC(date: Date = new Date(), timeZone: string = APP_TIMEZONE): Date {
  const { year, month, day } = getZonedParts(date, timeZone);
  let guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offsetHours = getZonedParts(guess, timeZone).hour;
  if (offsetHours !== 0) {
    guess = new Date(guess.getTime() - offsetHours * 3600_000);
  }
  return guess;
}

/** Istante UTC corrispondente alle `hour`:00 di oggi (data di `date`) nel fuso indicato. */
export function zonedTodayAt(hour: number, date: Date = new Date(), timeZone: string = APP_TIMEZONE): Date {
  return new Date(zonedStartOfDayUTC(date, timeZone).getTime() + hour * 3600_000);
}

/** Data di oggi nel fuso indicato, formato "2026-10-03": chiave stabile per "una volta al giorno". */
export function zonedDateKey(date: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  const { year, month, day } = getZonedParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
