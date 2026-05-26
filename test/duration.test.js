import { describe, expect, it } from 'vitest';
import { parseDuration, durationToSeconds, formatDuration, addDurationToDate } from '../src/lib/duration.js';

describe('parseDuration', () => {
  it('parses bare seconds', () => {
    expect(parseDuration(3600)).toEqual({ years: 0, months: 0, days: 0, seconds: 3600 });
  });

  it('parses "5d"', () => {
    const d = parseDuration('5d');
    expect(d.days).toBe(5);
  });

  it('parses "1w 2d"', () => {
    const d = parseDuration('1w 2d');
    expect(d.days).toBe(9);
  });

  it('parses "08:00" as hours:minutes', () => {
    const d = parseDuration('08:00');
    expect(d.seconds).toBe(8 * 3600);
  });

  it('parses ISO 8601 P5D', () => {
    const d = parseDuration('P5D');
    expect(d.days).toBe(5);
  });

  it('parses object form', () => {
    expect(parseDuration({ days: 3, hours: 2 })).toEqual({ years: 0, months: 0, days: 3, seconds: 7200 });
  });

  it('rolls up weeks into days', () => {
    expect(parseDuration({ weeks: 2 }).days).toBe(14);
  });
});

describe('durationToSeconds', () => {
  it('sums days + seconds', () => {
    expect(durationToSeconds({ days: 1, seconds: 30 })).toBe(86430);
  });
});

describe('formatDuration', () => {
  it('renders 5d', () => {
    expect(formatDuration({ years: 0, months: 0, days: 5, seconds: 0 })).toBe('5d');
  });
  it('renders compound 1d 2h', () => {
    expect(formatDuration({ years: 0, months: 0, days: 1, seconds: 7200 })).toBe('1d 2h');
  });
});

describe('addDurationToDate', () => {
  it('adds 5d to 2026-06-01', () => {
    const result = addDurationToDate(new Date(Date.UTC(2026, 5, 1)), parseDuration('5d'));
    expect(result.toISOString().slice(0, 10)).toBe('2026-06-06');
  });
});
