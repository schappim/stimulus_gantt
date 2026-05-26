// View definitions — time axis & column rules per zoom level.
// Each view exports:
//   slotMs      — millisecond width of one timeline slot
//   defaultColumnWidth
//   columnsBetween(start, end) → number of slots between
//   addSlots(date, n) → new Date `n` slots forward
//   buildHeader(start, end, opts) → { tiers: [{ cells: [{ label, span }] }, ...] }
//   formatTick(date)  → ISO-ish label for a single cell
//   slotForDate(date, start) → integer slot index
//   dateForSlot(slot, start) → Date

import { hourView } from './hour.js';
import { dayView } from './day.js';
import { weekView } from './week.js';
import { monthView } from './month.js';
import { quarterView } from './quarter.js';
import { yearView } from './year.js';

export const VIEWS = {
  hour: hourView,
  day: dayView,
  week: weekView,
  month: monthView,
  quarter: quarterView,
  year: yearView,
};

export function getView(name) {
  return VIEWS[name] || VIEWS.day;
}

export const VIEW_ORDER = ['hour', 'day', 'week', 'month', 'quarter', 'year'];

export function zoomView(name, delta) {
  const i = VIEW_ORDER.indexOf(name);
  if (i === -1) return name;
  const j = Math.max(0, Math.min(VIEW_ORDER.length - 1, i + delta));
  return VIEW_ORDER[j];
}
