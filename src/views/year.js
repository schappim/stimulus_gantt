import { startOfYear, addYears } from '../lib/date.js';

const YEAR_MS = 365 * 86_400_000;

function yearsBetween(start, end) {
  return Math.max(0, end.getUTCFullYear() - start.getUTCFullYear()
    + (end.getUTCMonth() > 0 || end.getUTCDate() > 1 ? 1 : 0));
}

export const yearView = {
  name: 'year',
  slotMs: YEAR_MS,
  defaultColumnWidth: 120,

  startOfRange(date) { return startOfYear(date); },
  endOfRange(date)   { return addYears(startOfYear(date), 1); },

  columnsBetween(start, end) { return yearsBetween(start, end); },

  addSlots(date, n) { return addYears(date, n); },

  dateForSlot(slot, start) { return addYears(start, slot); },
  slotForDate(date, start) { return date.getUTCFullYear() - start.getUTCFullYear(); },

  buildHeader(start, end) {
    const years = [];
    let y = startOfYear(start);
    while (y < end) {
      years.push({ label: String(y.getUTCFullYear()), span: 1, date: new Date(y.getTime()) });
      y = addYears(y, 1);
    }
    return {
      tiers: [
        { className: 'sg-tier-year', cells: years },
      ],
    };
  },
};
