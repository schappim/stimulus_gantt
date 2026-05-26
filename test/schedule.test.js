import { describe, expect, it } from 'vitest';
import { Store } from '../src/lib/model.js';
import { scheduleProject, computeTaskSlack, reflowSuccessors } from '../src/lib/schedule.js';

function buildStore(tasks, deps = []) {
  const s = new Store();
  s.setTasks(tasks);
  s.setDependencies(deps);
  return s;
}

describe('scheduleProject — simple linear chain', () => {
  it('FS chain critical-path = everything', () => {
    const s = buildStore([
      { id: '1', name: 'Design', start: '2026-06-01', end: '2026-06-05' },
      { id: '2', name: 'Build',  start: '2026-06-05', end: '2026-06-12' },
      { id: '3', name: 'Launch', start: '2026-06-12', end: '2026-06-15' },
    ], [
      { id: 'd1', from: '1', to: '2', type: 'FS' },
      { id: 'd2', from: '2', to: '3', type: 'FS' },
    ]);
    const sched = scheduleProject(s);
    expect(sched.criticalTaskIds.size).toBe(3);
    expect(sched.byId.get('3').slack).toBe(0);
  });
});

describe('scheduleProject — parallel paths', () => {
  it('non-critical task has positive slack', () => {
    const s = buildStore([
      { id: 'A', start: '2026-06-01', end: '2026-06-02' },
      { id: 'B', start: '2026-06-02', end: '2026-06-10' },
      { id: 'C', start: '2026-06-02', end: '2026-06-04' },
      { id: 'D', start: '2026-06-10', end: '2026-06-12' },
    ], [
      { id: 'd1', from: 'A', to: 'B' },
      { id: 'd2', from: 'A', to: 'C' },
      { id: 'd3', from: 'B', to: 'D' },
      { id: 'd4', from: 'C', to: 'D' },
    ]);
    const sched = scheduleProject(s);
    expect(sched.criticalTaskIds.has('B')).toBe(true);
    expect(sched.criticalTaskIds.has('C')).toBe(false);
    expect(sched.byId.get('C').slack).toBeGreaterThan(0);
  });
});

describe('reflowSuccessors', () => {
  it('pushes FS successor forward when predecessor extends', () => {
    const tasks = [
      { id: '1', start: '2026-06-01', end: '2026-06-05' },
      { id: '2', start: '2026-06-05', end: '2026-06-10' },
    ];
    const s = buildStore(tasks, [{ id: 'd1', from: '1', to: '2', type: 'FS' }]);
    // Move pred's end out by 2 days.
    s.tasks[0].end = new Date('2026-06-07T00:00:00Z');
    const result = reflowSuccessors('1', s);
    expect(result.updates.length).toBe(1);
    expect(result.updates[0].id).toBe('2');
    expect(result.updates[0].start.toISOString().slice(0, 10)).toBe('2026-06-07');
  });

  it('strict mode rejects when constraint violated', () => {
    const tasks = [
      { id: '1', start: '2026-06-01', end: '2026-06-05' },
      { id: '2', start: '2026-06-05', end: '2026-06-10', constraintType: 'mustStartOn', constraintDate: '2026-06-05' },
    ];
    const s = buildStore(tasks, [{ id: 'd1', from: '1', to: '2', type: 'FS' }]);
    s.tasks[0].end = new Date('2026-06-07T00:00:00Z');
    const result = reflowSuccessors('1', s, { strategy: 'strict' });
    expect(result.conflict).toBe(true);
  });
});

describe('computeTaskSlack', () => {
  it('zero slack for tasks on the critical path', () => {
    const s = buildStore([
      { id: '1', start: '2026-06-01', end: '2026-06-02' },
      { id: '2', start: '2026-06-02', end: '2026-06-05' },
    ], [{ from: '1', to: '2', type: 'FS' }]);
    const slack = computeTaskSlack('1', s);
    expect(slack.total).toBe(0);
  });
});
