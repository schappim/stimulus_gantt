import { startOfMonth, addMonths, startOfYear, addYears } from '../lib/date.js';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function monthsBetween(start, end) {
  return Math.max(0, (end.getUTCFullYear() - start.getUTCFullYear()) * 12
    + (end.getUTCMonth() - start.getUTCMonth())
    + (end.getUTCDate() > 1 || end.getUTCHours() > 0 ? 1 : 0));
}

export const monthView = {
  name: 'month',
  slotMs: 30 * 86_400_000, // approximate — used only by DnD snapping defaults
  defaultColumnWidth: 96,

  startOfRange(date) { return startOfMonth(date); },
  endOfRange(date)   { return addMonths(startOfMonth(date), 1); },

  columnsBetween(start, end) {
    return monthsBetween(start, end);
  },

  addSlots(date, n) { return addMonths(date, n); },

  dateForSlot(slot, start) { return addMonths(start, slot); },
  slotForDate(date, start) {
    return (date.getUTCFullYear() - start.getUTCFullYear()) * 12
      + (date.getUTCMonth() - start.getUTCMonth());
  },

  buildHeader(start, end) {
    const years = [];
    const months = [];
    let y = startOfYear(start);
    while (y < end) {
      const next = addYears(y, 1);
      const ys = y < start ? start : y;
      const ye = next > end ? end : next;
      years.push({
        label: String(y.getUTCFullYear()),
        span: Math.max(1, monthsBetween(ys, ye)),
      });
      y = next;
    }
    let m = startOfMonth(start);
    while (m < end) {
      months.push({
        label: MONTH_NAMES[m.getUTCMonth()],
        span: 1,
        date: new Date(m.getTime()),
      });
      m = addMonths(m, 1);
    }
    return {
      tiers: [
        { className: 'sg-tier-year',  cells: years },
        { className: 'sg-tier-month', cells: months },
      ],
    };
  },
};
