import { describe, expect, it } from 'vitest';
import { Store, normalizeTask, normalizeDependency, normalizeResource, buildTaskIndex, rollupSummary, taskToWireFormat } from '../src/lib/model.js';

describe('normalizeTask', () => {
  it('parses YYYY-MM-DD start/end', () => {
    const t = normalizeTask({ id: '1', name: 'Build', start: '2026-06-01', end: '2026-06-05' });
    expect(t.id).toBe('1');
    expect(t.start.toISOString().slice(0, 10)).toBe('2026-06-01');
    expect(t.end.toISOString().slice(0, 10)).toBe('2026-06-05');
  });

  it('derives end from start + duration', () => {
    const t = normalizeTask({ id: '1', start: '2026-06-01', duration: '3d' });
    expect(t.end.toISOString().slice(0, 10)).toBe('2026-06-04');
  });

  it('handles milestone (zero-duration)', () => {
    const t = normalizeTask({ id: '1', start: '2026-06-22', milestone: 'true' });
    expect(t.milestone).toBe(true);
    expect(t.start).toEqual(t.end);
  });

  it('parses progress as 0..1 OR 0..100', () => {
    expect(normalizeTask({ id: '1', progress: 0.4 }).progress).toBe(0.4);
    expect(normalizeTask({ id: '2', progress: '40' }).progress).toBe(0.4);
  });

  it('parses resourceIds JSON', () => {
    const t = normalizeTask({ id: '1', resourceIds: '["u1","u2"]' });
    expect(t.resourceIds).toEqual(['u1', 'u2']);
  });

  it('reads HTML element dataset', () => {
    const li = document.createElement('li');
    li.dataset.taskId = '99';
    li.dataset.taskName = 'Launch';
    li.dataset.taskMilestone = 'true';
    li.dataset.taskStart = '2026-09-01';
    const t = normalizeTask(li);
    expect(t.id).toBe('99');
    expect(t.name).toBe('Launch');
    expect(t.milestone).toBe(true);
  });
});

describe('normalizeDependency', () => {
  it('defaults to FS', () => {
    const d = normalizeDependency({ id: 'd1', from: '1', to: '2' });
    expect(d.type).toBe('FS');
  });

  it('lowercase type uppercases', () => {
    const d = normalizeDependency({ id: 'd1', from: '1', to: '2', type: 'ss' });
    expect(d.type).toBe('SS');
  });

  it('parses lag duration', () => {
    const d = normalizeDependency({ id: 'd1', from: '1', to: '2', lag: '2d' });
    expect(d.lag.days).toBe(2);
  });

  it('rejects unknown types', () => {
    const d = normalizeDependency({ id: 'd1', from: '1', to: '2', type: 'XX' });
    expect(d.type).toBe('FS');
  });
});

describe('normalizeResource', () => {
  it('defaults capacity to 1', () => {
    const r = normalizeResource({ id: 'u1', name: 'Alex' });
    expect(r.capacity).toBe(1);
  });
});

describe('buildTaskIndex', () => {
  it('flattens to ordered list with depth + path', () => {
    const tasks = [
      normalizeTask({ id: '1', name: 'A' }),
      normalizeTask({ id: '2', name: 'B', parentId: '1' }),
      normalizeTask({ id: '3', name: 'C', parentId: '1' }),
      normalizeTask({ id: '4', name: 'D' }),
    ];
    const idx = buildTaskIndex(tasks);
    expect(idx.order).toEqual(['1', '2', '3', '4']);
    expect(idx.byId.get('2').depth).toBe(1);
    expect(idx.byId.get('2').path).toEqual([1, 1]);
    expect(idx.byId.get('3').path).toEqual([1, 2]);
  });
});

describe('rollupSummary', () => {
  it('sums earliest start + latest end + weighted progress', () => {
    const tasks = [
      normalizeTask({ id: '1', summary: true, name: 'Parent' }),
      normalizeTask({ id: '2', parentId: '1', start: '2026-06-01', end: '2026-06-05', progress: 1 }),
      normalizeTask({ id: '3', parentId: '1', start: '2026-06-10', end: '2026-06-12', progress: 0 }),
    ];
    const idx = buildTaskIndex(tasks);
    const r = rollupSummary({ id: '1' }, idx);
    expect(r.start.toISOString().slice(0, 10)).toBe('2026-06-01');
    expect(r.end.toISOString().slice(0, 10)).toBe('2026-06-12');
    expect(r.progress).toBeGreaterThan(0);
    expect(r.progress).toBeLessThan(1);
  });
});

describe('Store', () => {
  it('upserts tasks', () => {
    const s = new Store();
    s.setTasks([{ id: '1', name: 'A' }, { id: '2', name: 'B' }]);
    expect(s.tasks.length).toBe(2);
    s.upsertTask({ id: '1', name: 'A renamed' });
    expect(s.tasks.find((t) => t.id === '1').name).toBe('A renamed');
  });

  it('removes tasks AND their dependencies', () => {
    const s = new Store();
    s.setTasks([{ id: '1', name: 'A' }, { id: '2', name: 'B' }]);
    s.setDependencies([{ id: 'd1', from: '1', to: '2' }]);
    s.removeTaskById('1');
    expect(s.tasks.length).toBe(1);
    expect(s.dependencies.length).toBe(0);
  });

  it('applyTransaction round-trips', () => {
    const s = new Store();
    s.applyTransaction({
      add: {
        tasks: [{ id: '1', name: 'A' }],
        dependencies: [],
      },
    });
    expect(s.tasks.length).toBe(1);
    s.applyTransaction({
      update: { tasks: [{ id: '1', name: 'A updated' }] },
    });
    expect(s.tasks[0].name).toBe('A updated');
  });
});

describe('taskToWireFormat', () => {
  it('serialises ISO dates', () => {
    const t = normalizeTask({ id: '1', start: '2026-06-01', end: '2026-06-05' });
    expect(taskToWireFormat(t).start).toBe('2026-06-01T00:00:00Z');
  });
});
