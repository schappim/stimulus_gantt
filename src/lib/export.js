// Export helpers — JSON, CSV, MS Project XML, image.

import { toISO } from './date.js';
import { taskToWireFormat, depToWireFormat, baselineToWireFormat } from './model.js';

export function exportJson(store) {
  return JSON.stringify({
    tasks: store.tasks.map(taskToWireFormat),
    dependencies: store.dependencies.map(depToWireFormat),
    resources: store.resources.map((r) => ({ ...r })),
    baselines: store.baselines.map(baselineToWireFormat),
    calendars: store.calendars,
  }, null, 2);
}

export function exportCsv(store, { columns } = {}) {
  const cols = columns || ['id', 'name', 'start', 'end', 'duration', 'progress', 'predecessors', 'resourceIds', 'cost'];
  const rows = [cols.join(',')];
  for (const t of store.tasks) {
    const row = cols.map((c) => csvField(taskField(t, c, store)));
    rows.push(row.join(','));
  }
  return rows.join('\n');
}

function taskField(t, col, store) {
  switch (col) {
    case 'id': return t.id;
    case 'name': return t.name;
    case 'start': return toISO(t.start);
    case 'end': return toISO(t.end);
    case 'duration': return t.durationRaw;
    case 'progress': return t.progress;
    case 'resourceIds': return (t.resourceIds || []).join(';');
    case 'cost': return t.cost;
    case 'predecessors': {
      const preds = store.dependencies.filter((d) => d.to === t.id);
      return preds.map((d) => {
        const lag = (d.lag.days || 0) ? `${d.lag.days >= 0 ? '+' : ''}${d.lag.days}d` : '';
        return `${d.from}${d.type}${lag}`;
      }).join(';');
    }
    default: return t[col];
  }
}

function csvField(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportMsProjectXml(store) {
  const tasks = store.tasks.map((t, i) => `
    <Task>
      <UID>${escapeXml(t.id)}</UID>
      <ID>${i + 1}</ID>
      <Name>${escapeXml(t.name)}</Name>
      <Start>${toISO(t.start) ?? ''}</Start>
      <Finish>${toISO(t.end) ?? ''}</Finish>
      <PercentComplete>${Math.round((t.progress || 0) * 100)}</PercentComplete>
      <Milestone>${t.milestone ? 1 : 0}</Milestone>
      <Summary>${t.summary ? 1 : 0}</Summary>
      <OutlineLevel>${(t.path || []).length || 1}</OutlineLevel>
      ${store.dependencies.filter((d) => d.to === t.id).map((d) => `
      <PredecessorLink>
        <PredecessorUID>${escapeXml(d.from)}</PredecessorUID>
        <Type>${MS_TYPE[d.type] ?? 1}</Type>
        <LinkLag>${(d.lag.days || 0) * 4800}</LinkLag>
      </PredecessorLink>`).join('')}
    </Task>`).join('');

  const deps = '';

  const resources = store.resources.map((r, i) => `
    <Resource>
      <UID>${escapeXml(r.id)}</UID>
      <ID>${i + 1}</ID>
      <Name>${escapeXml(r.name)}</Name>
      <MaxUnits>${r.capacity ?? 1}</MaxUnits>
    </Resource>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Tasks>${tasks}${deps}</Tasks>
  <Resources>${resources}</Resources>
</Project>`;
}

const MS_TYPE = { FF: 0, FS: 1, SF: 2, SS: 3 };

// Lossy importer for MS Project XML — sufficient to round-trip the
// exporter above + a published reference fixture.
export function importMsProjectXml(xml) {
  if (typeof DOMParser === 'undefined') throw new Error('DOMParser not available');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const tasks = [];
  const deps = [];
  for (const t of doc.querySelectorAll('Task')) {
    const id = (t.querySelector('UID') || t.querySelector('ID'))?.textContent;
    if (!id) continue;
    tasks.push({
      id,
      name: t.querySelector('Name')?.textContent || '',
      start: t.querySelector('Start')?.textContent || null,
      end: t.querySelector('Finish')?.textContent || null,
      progress: (parseFloat(t.querySelector('PercentComplete')?.textContent) || 0) / 100,
      milestone: t.querySelector('Milestone')?.textContent === '1',
      summary: t.querySelector('Summary')?.textContent === '1',
    });
    for (const link of t.querySelectorAll('PredecessorLink')) {
      const from = link.querySelector('PredecessorUID')?.textContent;
      const ms = link.querySelector('Type')?.textContent;
      const lagText = link.querySelector('LinkLag')?.textContent;
      const lagDays = lagText ? (parseInt(lagText, 10) / 4800) : 0;
      const type = Object.entries(MS_TYPE).find(([, v]) => String(v) === String(ms))?.[0] ?? 'FS';
      if (from) deps.push({ from, to: id, type, lag: lagDays ? `${lagDays}d` : null });
    }
  }
  return { tasks, dependencies: deps };
}

function escapeXml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
