import { startOfQuarter, addMonths, startOfYear, addYears } from '../lib/date.js';

function quartersBetween(start, end) {
  return Math.max(0, Math.round((end - start) / (90 * 86_400_000)));
}

export const quarterView = {
  name: 'quarter',
  slotMs: 90 * 86_400_000,
  defaultColumnWidth: 80,

  startOfRange(date) { return startOfQuarter(date); },
  endOfRange(date)   { return addMonths(startOfQuarter(date), 3); },

  columnsBetween(start, end) { return quartersBetween(start, end); },

  addSlots(date, n) { return addMonths(date, n * 3); },

  dateForSlot(slot, start) { return addMonths(start, slot * 3); },
  slotForDate(date, start) {
    const months = (date.getUTCFullYear() - start.getUTCFullYear()) * 12
      + (date.getUTCMonth() - start.getUTCMonth());
    return Math.floor(months / 3);
  },

  buildHeader(start, end) {
    const years = [];
    const quarters = [];
    let y = startOfYear(start);
    while (y < end) {
      const next = addYears(y, 1);
      const ys = y < start ? start : y;
      const ye = next > end ? end : next;
      years.push({
        label: String(y.getUTCFullYear()),
        span: Math.max(1, quartersBetween(ys, ye)),
      });
      y = next;
    }
    let q = startOfQuarter(start);
    while (q < end) {
      const qn = Math.floor(q.getUTCMonth() / 3) + 1;
      quarters.push({ label: `Q${qn}`, span: 1, date: new Date(q.getTime()) });
      q = addMonths(q, 3);
    }
    return {
      tiers: [
        { className: 'sg-tier-year',    cells: years },
        { className: 'sg-tier-quarter', cells: quarters },
      ],
    };
  },
};
