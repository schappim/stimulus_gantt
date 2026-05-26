import { describe, expect, it } from 'vitest';
import {
  parseDate, toISODate, startOfWeek, startOfMonth, startOfQuarter,
  addDays, addMonths, addYears, isSameDay, isoWeekNumber,
} from '../src/lib/date.js';

describe('parseDate', () => {
  it('parses YYYY-MM-DD as UTC midnight', () => {
    const d = parseDate('2026-06-01');
    expect(d.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });
  it('parses YYYY-MM-DDTHH:MM:SSZ', () => {
    const d = parseDate('2026-06-01T13:30:00Z');
    expect(d.getUTCHours()).toBe(13);
  });
});

describe('toISODate', () => {
  it('formats YYYY-MM-DD', () => {
    expect(toISODate(parseDate('2026-06-09'))).toBe('2026-06-09');
  });
});

describe('startOfWeek', () => {
  it('Mon-first', () => {
    expect(toISODate(startOfWeek(parseDate('2026-06-10'), 1))).toBe('2026-06-08');
  });
  it('Sun-first', () => {
    expect(toISODate(startOfWeek(parseDate('2026-06-10'), 0))).toBe('2026-06-07');
  });
});

describe('startOfMonth', () => {
  it('returns 1st', () => {
    expect(toISODate(startOfMonth(parseDate('2026-06-15')))).toBe('2026-06-01');
  });
});

describe('startOfQuarter', () => {
  it('Q2 in June', () => {
    expect(toISODate(startOfQuarter(parseDate('2026-06-15')))).toBe('2026-04-01');
  });
});

describe('addDays / addMonths / addYears', () => {
  it('addDays crosses month', () => {
    expect(toISODate(addDays(parseDate('2026-06-30'), 1))).toBe('2026-07-01');
  });
  it('addMonths preserves day', () => {
    expect(toISODate(addMonths(parseDate('2026-06-15'), 2))).toBe('2026-08-15');
  });
  it('addYears', () => {
    expect(toISODate(addYears(parseDate('2026-06-15'), 1))).toBe('2027-06-15');
  });
});

describe('isSameDay', () => {
  it('matches', () => {
    expect(isSameDay(parseDate('2026-06-01T00:00:00Z'), parseDate('2026-06-01T13:00:00Z'))).toBe(true);
  });
  it('differs', () => {
    expect(isSameDay(parseDate('2026-06-01'), parseDate('2026-06-02'))).toBe(false);
  });
});

describe('isoWeekNumber', () => {
  it('Jan 4 of any year is week 1', () => {
    expect(isoWeekNumber(parseDate('2026-01-04'))).toBe(1);
  });
});
