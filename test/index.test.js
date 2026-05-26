import { describe, expect, it } from 'vitest';
import StimulusGantt, {
  VERSION, start, GanttController, parseDuration, parseDate, scheduleProject,
} from '../src/index.js';

describe('public API', () => {
  it('exports VERSION', () => {
    expect(VERSION).toMatch(/^\d+\.\d+/);
  });

  it('exports the named controller class', () => {
    expect(typeof GanttController).toBe('function');
  });

  it('default export wraps the same surface', () => {
    expect(StimulusGantt.start).toBe(start);
    expect(StimulusGantt.VERSION).toBe(VERSION);
  });

  it('re-exports lib helpers', () => {
    expect(typeof parseDuration).toBe('function');
    expect(typeof parseDate).toBe('function');
    expect(typeof scheduleProject).toBe('function');
  });
});
