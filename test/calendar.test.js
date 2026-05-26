import { describe, expect, it } from 'vitest';
import { isWorkingDay, isWorkingTime, normalizeCalendar, addBusinessDuration, durationBetween, workingSecondsPerDay } from '../src/lib/calendar.js';
import { parseDate } from '../src/lib/date.js';

const FT = {
  id: 'fulltime',
  weekdays: [1, 2, 3, 4, 5],
  hours: [['09:00', '17:00']],
};

describe('normalizeCalendar', () => {
  it('defaults to Mon-Fri', () => {
    const cal = normalizeCalendar({});
    expect(cal.weekdays).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('isWorkingDay', () => {
  it('Mon is working', () => {
    expect(isWorkingDay(parseDate('2026-06-01'), FT)).toBe(true);
  });
  it('Sat is not working', () => {
    expect(isWorkingDay(parseDate('2026-06-06'), FT)).toBe(false);
  });
  it('Holidays are not working', () => {
    const cal = { ...FT, holidays: ['2026-12-25'] };
    expect(isWorkingDay(parseDate('2026-12-25'), cal)).toBe(false);
  });
});

describe('isWorkingTime', () => {
  it('09:30 Mon is working', () => {
    expect(isWorkingTime(parseDate('2026-06-01T09:30:00Z'), FT)).toBe(true);
  });
  it('06:00 Mon is not working', () => {
    expect(isWorkingTime(parseDate('2026-06-01T06:00:00Z'), FT)).toBe(false);
  });
});

describe('workingSecondsPerDay', () => {
  it('9-17 = 8h', () => {
    expect(workingSecondsPerDay(FT)).toBe(8 * 3600);
  });
});

describe('addBusinessDuration', () => {
  it('adds 2h to 10:00 Mon → 12:00 Mon', () => {
    const result = addBusinessDuration(parseDate('2026-06-01T10:00:00Z'), '2h', FT);
    expect(result.toISOString().slice(0, 16)).toBe('2026-06-01T12:00');
  });

  it('skips weekends', () => {
    const result = addBusinessDuration(parseDate('2026-06-05T15:00:00Z'), '4h', FT);
    // Fri 15:00 + 2h = Fri 17:00; remaining 2h falls into Mon 09:00 → Mon 11:00
    expect(result.toISOString().slice(0, 16)).toBe('2026-06-08T11:00');
  });
});

describe('durationBetween', () => {
  it('counts working seconds inside the same day', () => {
    const a = parseDate('2026-06-01T10:00:00Z');
    const b = parseDate('2026-06-01T12:00:00Z');
    expect(durationBetween(a, b, FT)).toBe(2 * 3600);
  });
});
