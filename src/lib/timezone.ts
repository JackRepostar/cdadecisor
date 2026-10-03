import "server-only";
import { APP_TIMEZONE } from "@/lib/app-timezone";

// I server di produzione (es. le funzioni serverless di Vercel) girano in UTC, non
// nel fuso orario italiano: usare Date.setHours()/getHours() per ragionare su "le
// 15:00" è quindi un bug che si manifesta solo in produzione. Questo modulo calcola
// data/ora usando esplicitamente il fuso dell'azienda, indipendentemente da dove
// gira il processo Node.
export { APP_TIMEZONE };

export function zonedParts(date: Date, timeZone: string = APP_TIMEZONE) {
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

/**
 * Istante UTC in cui l'orologio del fuso indicato segna esattamente ora:00 del giorno
 * (anno, mese, giorno). Corregge l'offset due volte, così è giusto anche nei due giorni
 * dell'anno in cui cambia l'ora legale (di 23 o 25 ore).
 */
export function zonedWallTimeToUTC(
  year: number,
  month: number,
  day: number,
  hour: number,
  timeZone: string = APP_TIMEZONE
): Date {
  const target = Date.UTC(year, month - 1, day, hour);
  let utc = target;
  for (let i = 0; i < 2; i += 1) {
    const p = zonedParts(new Date(utc), timeZone);
    utc -= Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - target;
  }
  return new Date(utc);
}

/** L'ora corrente (0-23) nel fuso orario dell'app, a prescindere dal fuso del server. */
export function getZonedHour(date: Date = new Date(), timeZone: string = APP_TIMEZONE): number {
  return zonedParts(date, timeZone).hour;
}

/** Istante UTC corrispondente alla mezzanotte del giorno di `date` nel fuso indicato. */
export function zonedStartOfDayUTC(date: Date = new Date(), timeZone: string = APP_TIMEZONE): Date {
  const { year, month, day } = zonedParts(date, timeZone);
  return zonedWallTimeToUTC(year, month, day, 0, timeZone);
}

/** Istante UTC corrispondente alle `hour`:00 del giorno di `date` nel fuso indicato. */
export function zonedTodayAt(hour: number, date: Date = new Date(), timeZone: string = APP_TIMEZONE): Date {
  const { year, month, day } = zonedParts(date, timeZone);
  return zonedWallTimeToUTC(year, month, day, hour, timeZone);
}

/** Data di oggi nel fuso indicato, formato "2026-10-03": chiave stabile per "una volta al giorno". */
export function zonedDateKey(date: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  const { year, month, day } = zonedParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
