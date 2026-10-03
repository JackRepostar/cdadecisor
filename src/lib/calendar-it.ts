import "server-only";
import { zonedParts } from "@/lib/timezone";

// Giorni in cui il recap e la pubblicazione NON partono: sabato, domenica e festività.
// Si ragiona sempre sulla data civile nel fuso Europa/Roma (non su quella del server).
export type CivilDate = { year: number; month: number; day: number };

const FIXED_HOLIDAYS = new Set([
  "01-01", // Capodanno
  "01-06", // Epifania
  "04-25", // Festa della Liberazione
  "05-01", // Festa dei lavoratori
  "06-02", // Festa della Repubblica
  "08-15", // Ferragosto
  "11-01", // Ognissanti
  "12-08", // Immacolata Concezione
  "12-25", // Natale
  "12-26", // Santo Stefano
]);

/** Domenica di Pasqua (calendario gregoriano, algoritmo di Meeus/Jones/Butcher). */
export function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Festività locali o chiusure aziendali (patrono, ponti), senza toccare il codice:
 * variabile RECAP_EXTRA_HOLIDAYS con date separate da virgola, nel formato "MM-GG"
 * (ogni anno, es. 12-07) oppure "AAAA-MM-GG" (una volta sola). Valori non validi ignorati.
 */
function extraHolidays() {
  const result = new Set<string>();
  for (const token of (process.env.RECAP_EXTRA_HOLIDAYS ?? "").split(/[\s,;]+/)) {
    if (/^\d{2}-\d{2}$/.test(token) || /^\d{4}-\d{2}-\d{2}$/.test(token)) result.add(token);
  }
  return result;
}

export function civilDateOf(date: Date): CivilDate {
  const { year, month, day } = zonedParts(date);
  return { year, month, day };
}

export function addCivilDays(civil: CivilDate, days: number): CivilDate {
  const d = new Date(Date.UTC(civil.year, civil.month - 1, civil.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function isWorkingCivilDate(civil: CivilDate): boolean {
  const weekday = new Date(Date.UTC(civil.year, civil.month - 1, civil.day)).getUTCDay();
  if (weekday === 0 || weekday === 6) return false;

  const monthDay = `${pad(civil.month)}-${pad(civil.day)}`;
  if (FIXED_HOLIDAYS.has(monthDay)) return false;

  const easter = easterSunday(civil.year);
  const easterMonday = addCivilDays({ year: civil.year, ...easter }, 1);
  if (civil.month === easterMonday.month && civil.day === easterMonday.day) return false;

  const extra = extraHolidays();
  return !extra.has(monthDay) && !extra.has(`${civil.year}-${monthDay}`);
}

export function isWorkingDay(date: Date = new Date()): boolean {
  return isWorkingCivilDate(civilDateOf(date));
}
