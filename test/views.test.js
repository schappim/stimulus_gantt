import { describe, expect, it } from 'vitest';
import { dayView } from '../src/views/day.js';
import { weekView } from '../src/views/week.js';
import { monthView } from '../src/views/month.js';
import { hourView } from '../src/views/hour.js';
import { quarterView } from '../src/views/quarter.js';
import { yearView } from '../src/views/year.js';
import { parseDate } from '../src/lib/date.js';

describe('dayView', () => {
  it('1 day = 1 column', () => {
    expect(dayView.columnsBetween(parseDate('2026-06-01'), parseDate('2026-06-02'))).toBe(1);
  });
  it('header has month + day tiers', () => {
    const head = dayView.buildHeader(parseDate('2026-06-01'), parseDate('2026-06-08'));
    expect(head.tiers.length).toBe(2);
    expect(head.tiers[1].cells.length).toBe(7);
  });
});

describe('weekView', () => {
  it('7 days = 1 column', () => {
    expect(weekView.columnsBetween(parseDate('2026-06-08'), parseDate('2026-06-15'))).toBe(1);
  });
});

describe('monthView', () => {
  it('Jun→Jul = 1 column', () => {
    expect(monthView.columnsBetween(parseDate('2026-06-01'), parseDate('2026-07-01'))).toBe(1);
  });
});

describe('hourView', () => {
  it('1 hour = 1 column', () => {
    expect(hourView.columnsBetween(
      parseDate('2026-06-01T09:00:00Z'),
      parseDate('2026-06-01T10:00:00Z'),
    )).toBe(1);
  });
});

describe('quarterView', () => {
  it('Q2 = 1 column', () => {
    expect(quarterView.columnsBetween(parseDate('2026-04-01'), parseDate('2026-07-01'))).toBe(1);
  });
});

describe('yearView', () => {
  it('1 year = 1 column', () => {
    expect(yearView.columnsBetween(parseDate('2026-01-01'), parseDate('2027-01-01'))).toBe(1);
  });
});
