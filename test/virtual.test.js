import { describe, expect, it } from 'vitest';
import { rowWindow, columnWindow } from '../src/lib/virtual.js';

describe('rowWindow', () => {
  it('returns full window when within viewport', () => {
    const w = rowWindow({ count: 10, rowHeight: 32, scrollTop: 0, viewport: 400 });
    expect(w.startIndex).toBe(0);
    expect(w.endIndex).toBe(10);
    expect(w.paddingTop).toBe(0);
  });

  it('respects scrollTop offset', () => {
    const w = rowWindow({ count: 1000, rowHeight: 32, scrollTop: 1600, viewport: 400, overscan: 0 });
    expect(w.startIndex).toBe(50);
    expect(w.paddingTop).toBe(50 * 32);
  });

  it('caps at count', () => {
    const w = rowWindow({ count: 100, rowHeight: 32, scrollTop: 9999, viewport: 400 });
    expect(w.endIndex).toBeLessThanOrEqual(100);
  });
});

describe('columnWindow', () => {
  it('produces padding on both sides', () => {
    const w = columnWindow({ totalCols: 1000, scrollLeft: 200, viewport: 600, columnWidth: 32, overscan: 0 });
    expect(w.paddingLeft).toBeGreaterThan(0);
    expect(w.paddingRight).toBeGreaterThan(0);
  });
});
