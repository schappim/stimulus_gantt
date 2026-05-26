// Working-time / calendar arithmetic.
//
// A calendar is:
//   {
//     id:        "default",
//     weekdays:  [1, 2, 3, 4, 5],          // 0=Sun..6=Sat. Working days.
//     hours:     [["09:00", "17:00"]],     // working spans inside a day.
//     holidays:  ["2026-12-25", ...],      // ISO date strings, non-working.
//   }
//
// Resolution: task.calendarId → resource.calendarId → project calendar id
// → fall back to the synthetic "24x7" calendar (all hours, every day).

import { parseDate, startOfDay, addDays, MS } from './date.js';
import { parseDuration, durationToSeconds } from './duration.js';

const TWENTY_FOUR_SEVEN = {
  id: '247',
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  hours: [['00:00', '24:00']],
  holidays: [],
};

export function normalizeCalendar(input) {
  if (!input) return TWENTY_FOUR_SEVEN;
  return {
    id: input.id ?? 'default',
    weekdays: Array.isArray(input.weekdays) ? input.weekdays.slice() : [1, 2, 3, 4, 5],
    hours: normalizeHours(input.hours),
    holidays: (input.holidays || []).map((d) => typeof d === 'string' ? d : toISODate(d)),
  };
}

function normalizeHours(hours) {
  if (!hours || !hours.length) return [['00:00', '24:00']];
  return hours.map(([from, to]) => [from, to]);
}

function toISODate(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  const date = parseDate(d);
  if (!date) return null;
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

function timeToMinutes(time) {
  if (typeof time === 'number') return time;
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + (m || 0);
}

export function isWorkingDay(date, calendar) {
  const cal = normalizeCalendar(calendar);
  const iso = toISODate(date);
  if (cal.holidays.includes(iso)) return false;
  return cal.weekdays.includes(date.getUTCDay());
}

// Total working seconds in one weekday for the calendar.
export function workingSecondsPerDay(calendar) {
  const cal = normalizeCalendar(calendar);
  let sec = 0;
  for (const [from, to] of cal.hours) {
    sec += (timeToMinutes(to) - timeToMinutes(from)) * 60;
  }
  return sec;
}

// Walk forward from `date` by `duration` honouring the calendar.
// Used by auto-scheduling: pushing a predecessor forward sets the
// successor's start at the next working slot.
export function addBusinessDuration(date, duration, calendar) {
  const cal = normalizeCalendar(calendar);
  const dur = parseDuration(duration);
  let remaining = durationToSeconds(dur);
  let cur = new Date(date.getTime());
  if (remaining === 0) return cur;

  const forward = remaining > 0;
  remaining = Math.abs(remaining);

  // Hop hour by hour through working spans. Cheap enough for plans of
  // any sane size; the alternative (slot indexing) is much faster but a
  // lot more code, and the call sites are typically one date at a time.
  const STEP = 60; // seconds per micro-step
  let safety = 200_000; // safety break
  while (remaining > 0 && safety-- > 0) {
    if (!isWorkingDay(cur, cal)) {
      cur = forward
        ? new Date(startOfDay(addDays(cur, 1)))
        : new Date(addDays(startOfDay(cur), -1).getTime() + 24 * 3600_000 - 1000);
      continue;
    }
    // Check if current minute lies in a working span.
    const minutes = cur.getUTCHours() * 60 + cur.getUTCMinutes();
    const span = findContainingSpan(minutes, cal.hours, forward);
    if (!span) {
      // Snap to next working span (forward) or previous (backward).
      const next = forward
        ? nextSpanStart(minutes, cal.hours)
        : prevSpanEnd(minutes, cal.hours);
      if (next == null) {
        cur = forward
          ? new Date(startOfDay(addDays(cur, 1)))
          : new Date(addDays(startOfDay(cur), -1).getTime() + 24 * 3600_000 - 1000);
        continue;
      }
      const newMinutes = next;
      cur.setUTCHours(Math.floor(newMinutes / 60), newMinutes % 60, 0, 0);
      continue;
    }
    // Step inside the span.
    const [from, to] = span;
    if (forward) {
      const room = (to - minutes) * 60;
      if (remaining <= room) {
        cur = new Date(cur.getTime() + remaining * 1000);
        remaining = 0;
      } else {
        remaining -= room;
        cur = new Date(cur.getTime() + room * 1000);
      }
    } else {
      const room = (minutes - from) * 60;
      if (remaining <= room) {
        cur = new Date(cur.getTime() - remaining * 1000);
        remaining = 0;
      } else {
        remaining -= room;
        cur = new Date(cur.getTime() - room * 1000);
      }
    }
    // If we exhausted the span without exhausting remaining, advance.
    if (remaining > 0 && forward) {
      cur = new Date(startOfDay(addDays(cur, 1)));
    } else if (remaining > 0 && !forward) {
      cur = new Date(addDays(startOfDay(cur), -1).getTime() + 24 * 3600_000 - 1000);
    }
    void STEP;
  }
  return cur;
}

function findContainingSpan(minutes, hours, forward) {
  for (const [from, to] of hours) {
    const a = timeToMinutes(from);
    const b = timeToMinutes(to);
    if (forward && minutes >= a && minutes < b) return [a, b];
    if (!forward && minutes > a && minutes <= b) return [a, b];
  }
  return null;
}

function nextSpanStart(minutes, hours) {
  for (const [from] of hours) {
    const a = timeToMinutes(from);
    if (a > minutes) return a;
  }
  return null;
}

function prevSpanEnd(minutes, hours) {
  let best = null;
  for (const [, to] of hours) {
    const b = timeToMinutes(to);
    if (b < minutes && (best == null || b > best)) best = b;
  }
  return best;
}

// Working duration between two dates (seconds).
export function durationBetween(a, b, calendar) {
  const cal = normalizeCalendar(calendar);
  if (a.getTime() === b.getTime()) return 0;
  const forward = b > a;
  let lo = forward ? a : b;
  let hi = forward ? b : a;
  let total = 0;
  const guard = 50_000;
  let n = 0;
  let cursor = new Date(lo.getTime());
  while (cursor < hi && n++ < guard) {
    if (!isWorkingDay(cursor, cal)) {
      cursor = startOfDay(addDays(cursor, 1));
      continue;
    }
    const dayStart = startOfDay(cursor);
    for (const [from, to] of cal.hours) {
      const a0 = new Date(dayStart.getTime() + timeToMinutes(from) * 60_000);
      const a1 = new Date(dayStart.getTime() + timeToMinutes(to) * 60_000);
      const lo2 = cursor > a0 ? cursor : a0;
      const hi2 = hi < a1 ? hi : a1;
      if (hi2 > lo2) {
        total += (hi2 - lo2) / 1000;
      }
    }
    cursor = startOfDay(addDays(cursor, 1));
  }
  return forward ? total : -total;
}

// True when the date lies in a working span (for shading / snap-on-drop).
export function isWorkingTime(date, calendar) {
  const cal = normalizeCalendar(calendar);
  if (!isWorkingDay(date, cal)) return false;
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  return cal.hours.some(([from, to]) =>
    minutes >= timeToMinutes(from) && minutes < timeToMinutes(to));
}

export function resolveTaskCalendar(task, resources, calendars, projectCalendarId) {
  const byId = (id) => calendars?.[id];
  if (task?.calendarId && byId(task.calendarId)) return normalizeCalendar(byId(task.calendarId));
  const rids = Array.isArray(task?.resourceIds) ? task.resourceIds : [];
  for (const rid of rids) {
    const r = resources?.find?.((x) => x.id === rid);
    if (r?.calendar && byId(r.calendar)) return normalizeCalendar(byId(r.calendar));
  }
  if (projectCalendarId && byId(projectCalendarId)) {
    return normalizeCalendar(byId(projectCalendarId));
  }
  return TWENTY_FOUR_SEVEN;
}

export { TWENTY_FOUR_SEVEN };
