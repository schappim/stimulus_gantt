// Date helpers — UTC-based to keep arithmetic deterministic across DST.

const DAY_MS = 86_400_000;
const MIN_MS = 60_000;
const HOUR_MS = 3_600_000;

export function parseDate(input) {
  if (input == null) return null;
  if (input instanceof Date) return new Date(input.getTime());
  if (typeof input === 'number') return new Date(input);
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (!s) return null;
  // YYYY-MM-DD → midnight UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  }
  // YYYY-MM-DDTHH:MM[:SS[.sss]][Z|±HH:MM]
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:?\d{2})?$/);
  if (m) {
    const [, y, mo, d, h, mi, se, ms, tz] = m;
    const date = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(se || 0), +(ms || 0)));
    if (tz && tz !== 'Z') {
      const sign = tz[0] === '-' ? -1 : 1;
      const hh = parseInt(tz.slice(1, 3), 10);
      const mm = parseInt(tz.slice(-2), 10);
      date.setTime(date.getTime() - sign * (hh * HOUR_MS + mm * MIN_MS));
    }
    return date;
  }
  // Fallback: native parsing.
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toISODate(date) {
  if (!date) return null;
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function toISODateTime(date) {
  if (!date) return null;
  return `${toISODate(date)}T${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}Z`;
}

export function toISO(date, opts = {}) {
  if (!date) return null;
  if (opts.dateOnly) return toISODate(date);
  return toISODateTime(date);
}

export function cloneDate(date) {
  return new Date(date.getTime());
}

export function startOfDay(date) {
  const d = cloneDate(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = cloneDate(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export function startOfWeek(date, firstDay = 1) {
  const d = startOfDay(date);
  const dow = d.getUTCDay();
  const diff = (dow - firstDay + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

export function endOfWeek(date, firstDay = 1) {
  const start = startOfWeek(date, firstDay);
  return addDays(start, 7);
}

export function startOfMonth(date) {
  const d = cloneDate(date);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(date) {
  const d = startOfMonth(date);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

export function startOfQuarter(date) {
  const d = startOfMonth(date);
  const q = Math.floor(d.getUTCMonth() / 3);
  d.setUTCMonth(q * 3);
  return d;
}

export function endOfQuarter(date) {
  const d = startOfQuarter(date);
  d.setUTCMonth(d.getUTCMonth() + 3);
  return d;
}

export function startOfYear(date) {
  const d = cloneDate(date);
  d.setUTCMonth(0, 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function endOfYear(date) {
  const d = startOfYear(date);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d;
}

export function startOfHour(date) {
  const d = cloneDate(date);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

export function addDays(date, n) {
  const d = cloneDate(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

export function addHours(date, n) {
  return new Date(date.getTime() + n * HOUR_MS);
}

export function addMinutes(date, n) {
  return new Date(date.getTime() + n * MIN_MS);
}

export function addMs(date, n) {
  return new Date(date.getTime() + n);
}

export function addMonths(date, n) {
  const d = cloneDate(date);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

export function addYears(date, n) {
  const d = cloneDate(date);
  d.setUTCFullYear(d.getUTCFullYear() + n);
  return d;
}

export function diffMs(a, b) {
  return a.getTime() - b.getTime();
}

export function diffDays(a, b) {
  return (a.getTime() - b.getTime()) / DAY_MS;
}

export function diffHours(a, b) {
  return (a.getTime() - b.getTime()) / HOUR_MS;
}

export function daysBetween(a, b) {
  return Math.round(diffDays(startOfDay(a), startOfDay(b)));
}

export function isSameDay(a, b) {
  if (!a || !b) return false;
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate();
}

export function isSameMonth(a, b) {
  return a && b && a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

export function maxDate(...dates) {
  return dates.filter(Boolean).reduce((acc, d) => acc == null || d > acc ? d : acc, null);
}

export function minDate(...dates) {
  return dates.filter(Boolean).reduce((acc, d) => acc == null || d < acc ? d : acc, null);
}

export function clampDate(date, lo, hi) {
  if (lo && date < lo) return lo;
  if (hi && date > hi) return hi;
  return date;
}

// ISO 8601 week number (Mon first day).
export function isoWeekNumber(date) {
  const d = cloneDate(date);
  d.setUTCHours(0, 0, 0, 0);
  // Thursday in the current week decides the year.
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const week1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - week1.getTime()) / DAY_MS - 3 + ((week1.getUTCDay() + 6) % 7)) / 7);
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export const MS = { DAY: DAY_MS, HOUR: HOUR_MS, MIN: MIN_MS };
