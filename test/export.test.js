import { describe, expect, it } from 'vitest';
import { Store } from '../src/lib/model.js';
import { exportJson, exportCsv, exportMsProjectXml, importMsProjectXml } from '../src/lib/export.js';

function buildStore() {
  const s = new Store();
  s.setTasks([
    { id: '1', name: 'A', start: '2026-06-01', end: '2026-06-05', progress: 0.5 },
    { id: '2', name: 'B', start: '2026-06-05', end: '2026-06-12' },
  ]);
  s.setDependencies([{ id: 'd1', from: '1', to: '2', type: 'FS', lag: '2d' }]);
  s.setResources([{ id: 'u1', name: 'Alex', capacity: 1 }]);
  return s;
}

describe('exportJson', () => {
  it('round-trips structure', () => {
    const s = buildStore();
    const json = exportJson(s);
    const parsed = JSON.parse(json);
    expect(parsed.tasks.length).toBe(2);
    expect(parsed.dependencies.length).toBe(1);
    expect(parsed.resources.length).toBe(1);
  });
});

describe('exportCsv', () => {
  it('contains header row', () => {
    const csv = exportCsv(buildStore());
    expect(csv.split('\n')[0]).toContain('id,name,start');
  });
  it('encodes predecessors with type', () => {
    const csv = exportCsv(buildStore());
    expect(csv).toContain('1FS');
  });
});

describe('MS Project XML', () => {
  it('exports + reimports tasks', () => {
    const s = buildStore();
    const xml = exportMsProjectXml(s);
    expect(xml).toContain('<Project');
    const imported = importMsProjectXml(xml);
    expect(imported.tasks.length).toBe(2);
    expect(imported.dependencies.length).toBe(1);
    expect(imported.dependencies[0].type).toBe('FS');
  });
});
