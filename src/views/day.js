import { startOfDay, addDays, startOfMonth, addMonths, MS, pad2 } from '../lib/date.js';

const DAY_MS = 86_400_000;
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa'];

export const dayView = {
  name: 'day',
  slotMs: DAY_MS,
  defaultColumnWidth: 32,

  startOfRange(date) { return startOfDay(date); },
  endOfRange(date)   { return addDays(startOfDay(date), 1); },

  columnsBetween(start, end) {
    return Math.max(0, Math.round((end - start) / DAY_MS));
  },

  addSlots(date, n) { return addDays(date, n); },

  dateForSlot(slot, start) { return addDays(start, slot); },
  slotForDate(date, start) { return Math.floor((date - start) / DAY_MS); },

  buildHeader(start, end) {
    const months = [];
    const days = [];
    let mCur = startOfMonth(start);
    while (mCur < end) {
      const next = addMonths(mCur, 1);
      const slotStart = mCur < start ? start : mCur;
      const slotEnd = next > end ? end : next;
      months.push({
        label: `${MONTH_NAMES[mCur.getUTCMonth()]} ${mCur.getUTCFullYear()}`,
        span: Math.max(1, Math.round((slotEnd - slotStart) / DAY_MS)),
      });
      mCur = next;
    }
    let d = startOfDay(start);
    while (d < end) {
      days.push({
        label: `${DOW[d.getUTCDay()]}\n${pad2(d.getUTCDate())}`,
        span: 1,
        date: new Date(d.getTime()),
      });
      d = addDays(d, 1);
    }
    return {
      tiers: [
        { className: 'sg-tier-month', cells: months },
        { className: 'sg-tier-day',   cells: days },
      ],
    };
  },
};
