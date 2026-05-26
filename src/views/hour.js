import { addHours, startOfHour, startOfDay, addDays, MS, pad2 } from '../lib/date.js';

const HOUR_MS = 3_600_000;

export const hourView = {
  name: 'hour',
  slotMs: HOUR_MS,
  defaultColumnWidth: 48,

  startOfRange(date) { return startOfHour(date); },
  endOfRange(date)   { return addHours(startOfHour(date), 1); },

  columnsBetween(start, end) {
    return Math.max(0, Math.round((end - start) / HOUR_MS));
  },

  addSlots(date, n) { return addHours(date, n); },

  dateForSlot(slot, start) { return addHours(start, slot); },
  slotForDate(date, start) { return Math.floor((date - start) / HOUR_MS); },

  buildHeader(start, end) {
    const days = [];
    const hours = [];
    let cur = startOfDay(start);
    while (cur < end) {
      const next = addDays(cur, 1);
      const slotStart = cur < start ? start : cur;
      const slotEnd = next > end ? end : next;
      days.push({
        label: `${pad2(cur.getUTCMonth() + 1)}-${pad2(cur.getUTCDate())}`,
        span: Math.max(1, Math.round((slotEnd - slotStart) / HOUR_MS)),
      });
      cur = next;
    }
    let h = startOfHour(start);
    while (h < end) {
      hours.push({ label: `${pad2(h.getUTCHours())}`, span: 1 });
      h = addHours(h, 1);
    }
    return {
      tiers: [
        { className: 'sg-tier-day', cells: days },
        { className: 'sg-tier-hour', cells: hours },
      ],
    };
  },
};
