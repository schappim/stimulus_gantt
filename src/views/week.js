import { startOfDay, startOfWeek, addDays, addMonths, startOfMonth, MS } from '../lib/date.js';

const WEEK_MS = 7 * 86_400_000;
const DAY_MS = 86_400_000;
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const weekView = {
  name: 'week',
  slotMs: WEEK_MS,
  defaultColumnWidth: 64,

  startOfRange(date) { return startOfWeek(date, 1); },
  endOfRange(date)   { return addDays(startOfWeek(date, 1), 7); },

  columnsBetween(start, end) {
    return Math.max(0, Math.round((end - start) / WEEK_MS));
  },

  addSlots(date, n) { return addDays(date, n * 7); },

  dateForSlot(slot, start) { return addDays(start, slot * 7); },
  slotForDate(date, start) { return Math.floor((date - start) / WEEK_MS); },

  buildHeader(start, end) {
    const months = [];
    const weeks = [];
    let m = startOfMonth(start);
    while (m < end) {
      const next = addMonths(m, 1);
      const slotStart = m < start ? start : m;
      const slotEnd = next > end ? end : next;
      months.push({
        label: `${MONTH_NAMES[m.getUTCMonth()]} ${m.getUTCFullYear()}`,
        span: Math.max(1, Math.round((slotEnd - slotStart) / WEEK_MS)),
      });
      m = next;
    }
    let w = startOfWeek(start, 1);
    let i = 0;
    while (w < end) {
      weeks.push({
        label: `W${isoWeek(w)}`,
        span: 1,
        date: new Date(w.getTime()),
      });
      w = addDays(w, 7);
      i++;
      if (i > 5200) break;
    }
    return {
      tiers: [
        { className: 'sg-tier-month', cells: months },
        { className: 'sg-tier-week',  cells: weeks },
      ],
    };
  },
};

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
