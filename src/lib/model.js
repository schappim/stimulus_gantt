// Model — task / dependency / resource / baseline normalisation, indexing,
// reducers used by the controller, the API surface, and the scheduler.
//
// The shape mirrors REQUIREMENTS.md §4 / §6 / §7.

import { parseDate, toISO, addDays } from './date.js';
import { parseDuration, durationToSeconds, addDurationToDate } from './duration.js';
import { isArray, isPlainObject, parseJsonAttr, deepClone } from './utils.js';

export const DEPENDENCY_TYPES = ['FS', 'SS', 'FF', 'SF'];
export const CONSTRAINT_TYPES = [
  'asSoonAsPossible',
  'asLateAsPossible',
  'mustStartOn',
  'mustFinishOn',
  'startNoEarlierThan',
  'startNoLaterThan',
  'finishNoEarlierThan',
  'finishNoLaterThan',
];

export function normalizeTask(raw) {
  if (!raw) return null;
  const dataset = raw.dataset || raw;
  const src = raw.dataset ? readTaskDataset(raw) : raw;
  const explicitJson = parseJsonAttr(src.json ?? src.taskJson, null);
  const merged = explicitJson ? { ...explicitJson, ...src } : { ...src };

  const id = merged.id != null ? String(merged.id) : null;
  if (!id) return null;
  const parentId = merged.parentId != null ? String(merged.parentId) : null;

  const start = parseDate(merged.start ?? merged.startDate ?? null);
  let end = parseDate(merged.end ?? merged.endDate ?? null);
  const durationStr = merged.duration ?? null;
  let duration = durationStr ? parseDuration(durationStr) : null;
  if (!end && start && duration) {
    end = addDurationToDate(start, duration);
  } else if (!duration && start && end) {
    duration = { years: 0, months: 0, days: Math.floor((end - start) / 86_400_000), seconds: ((end - start) / 1000) % 86_400 };
  }
  const milestone = boolish(merged.milestone);
  if (milestone) {
    end = end ?? start;
  }

  return {
    id,
    parentId,
    name: merged.name ?? '',
    start,
    end,
    duration,
    durationRaw: durationStr ?? null,
    effort: merged.effort != null ? parseDuration(merged.effort) : null,
    progress: clampProgress(merged.progress),
    actualStart: parseDate(merged.actualStart),
    actualEnd: parseDate(merged.actualEnd),
    milestone,
    summary: boolish(merged.summary),
    collapsed: boolish(merged.collapsed),
    locked: boolish(merged.locked),
    color: merged.color ?? null,
    textColor: merged.textColor ?? null,
    classNames: merged.classNames ?? merged.className ?? '',
    constraintType: merged.constraintType ?? null,
    constraintDate: parseDate(merged.constraintDate),
    calendarId: merged.calendarId ?? null,
    resourceIds: parseJsonAttr(merged.resourceIds, []) || [],
    assignments: parseJsonAttr(merged.assignments, null),
    cost: numOrNull(merged.cost),
    budgetedCost: numOrNull(merged.budgetedCost),
    priority: merged.priority != null ? Number(merged.priority) : null,
    renderer: merged.renderer ?? null,
    barRenderer: merged.barRenderer ?? null,
    synthetic: boolish(merged.synthetic),
    extra: merged.extra ?? null,
    dataset,
  };
}

function readTaskDataset(node) {
  if (!node?.dataset) return {};
  const out = {};
  for (const [key, value] of Object.entries(node.dataset)) {
    if (!key.startsWith('task')) continue;
    const tail = key.slice('task'.length);
    if (!tail) continue;
    const camel = tail[0].toLowerCase() + tail.slice(1);
    out[camel] = value;
  }
  return out;
}

export function normalizeDependency(raw) {
  if (!raw) return null;
  const src = raw.dataset ? readDataset(raw, 'dependency') : raw;
  const id = src.id != null ? String(src.id) : `${src.from}->${src.to}`;
  const type = (src.type ?? 'FS').toUpperCase();
  return {
    id,
    from: String(src.from),
    to: String(src.to),
    type: DEPENDENCY_TYPES.includes(type) ? type : 'FS',
    lag: src.lag ? parseDuration(src.lag) : { years: 0, months: 0, days: 0, seconds: 0 },
    color: src.color ?? null,
    classNames: src.classNames ?? '',
    hard: boolish(src.hard),
  };
}

export function normalizeResource(raw) {
  if (!raw) return null;
  return {
    id: String(raw.id),
    name: raw.name ?? raw.label ?? raw.id,
    calendar: raw.calendar ?? raw.calendarId ?? null,
    capacity: raw.capacity != null ? Number(raw.capacity) : 1.0,
    color: raw.color ?? null,
    avatar: raw.avatar ?? null,
    extra: raw.extra ?? null,
  };
}

export function normalizeBaseline(raw) {
  if (!raw) return null;
  return {
    id: String(raw.id ?? 'baseline'),
    name: raw.name ?? raw.id ?? 'Baseline',
    capturedAt: parseDate(raw.capturedAt) ?? new Date(),
    tasks: (raw.tasks || []).map((t) => ({
      id: String(t.id),
      start: parseDate(t.start),
      end: parseDate(t.end),
      progress: clampProgress(t.progress),
    })),
  };
}

function readDataset(node, prefix) {
  const out = {};
  for (const [key, value] of Object.entries(node.dataset || {})) {
    if (!key.startsWith(prefix)) continue;
    const tail = key.slice(prefix.length);
    if (!tail) continue;
    const camel = tail[0].toLowerCase() + tail.slice(1);
    out[camel] = value;
  }
  return out;
}

function boolish(v) {
  if (v == null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

function clampProgress(v) {
  if (v == null || v === '') return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  if (n > 1 && n <= 100) return n / 100;
  return Math.max(0, Math.min(1, n));
}

function numOrNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Tree-building. Tasks are returned as a flat array, but with `.depth`,
// `.children` (ids) and `.path` computed. Synthetic root with id=`__root__`
// is *not* injected — callers walk root tasks directly.
export function buildTaskIndex(tasks) {
  const byId = new Map();
  for (const t of tasks) byId.set(t.id, { ...t, children: [], depth: 0, path: [] });

  const roots = [];
  for (const t of byId.values()) {
    if (t.parentId && byId.has(t.parentId)) {
      byId.get(t.parentId).children.push(t.id);
    } else {
      roots.push(t.id);
    }
  }

  const order = [];
  const visit = (id, depth, path) => {
    const t = byId.get(id);
    if (!t) return;
    t.depth = depth;
    t.path = path;
    order.push(id);
    let i = 1;
    for (const childId of t.children) {
      visit(childId, depth + 1, [...path, i++]);
    }
  };
  let i = 1;
  for (const rootId of roots) visit(rootId, 0, [i++]);

  return { byId, order, roots };
}

// Compute span (min start, max end) and progress of a summary task from
// its descendants. Caller decides whether to apply or just inspect.
export function rollupSummary(task, index) {
  const t = index.byId.get(task.id);
  if (!t || !t.children?.length) return null;

  let earliest = null;
  let latest = null;
  let totalEffortSec = 0;
  let progressEffortSec = 0;

  const walk = (id) => {
    const node = index.byId.get(id);
    if (!node) return;
    if (node.children.length) {
      for (const c of node.children) walk(c);
    } else {
      if (node.start && (earliest == null || node.start < earliest)) earliest = node.start;
      if (node.end && (latest == null || node.end > latest)) latest = node.end;
      let sec = node.end && node.start ? Math.max(0, (node.end - node.start) / 1000) : 0;
      if (sec === 0 && node.effort) sec = durationToSeconds(node.effort);
      totalEffortSec += sec;
      progressEffortSec += sec * (node.progress ?? 0);
    }
  };
  walk(task.id);

  return {
    start: earliest,
    end: latest,
    progress: totalEffortSec > 0 ? progressEffortSec / totalEffortSec : 0,
  };
}

// Pure store. The controller owns ONE Store; renderers, scheduler and
// broadcast adapters all read from / dispatch into it.
export class Store {
  constructor() {
    this.tasks = [];           // normalised task list, ordered (WBS)
    this.dependencies = [];    // normalised dependency list
    this.resources = [];
    this.baselines = [];
    this.activeBaselineId = null;
    this.calendars = {};
    this.projectCalendarId = null;
    this.selection = new Set();
    this.depSelection = new Set();
    this.collapsed = new Set();
    this.subscribers = new Set();
    this.scheduledTasks = null; // cached schedule result
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  notify(detail = {}) {
    for (const fn of this.subscribers) fn(detail);
  }

  setTasks(tasks) {
    this.tasks = tasks.map(normalizeTask).filter(Boolean);
    this.scheduledTasks = null;
    this.notify({ kind: 'tasks' });
  }

  setDependencies(deps) {
    this.dependencies = deps.map(normalizeDependency).filter(Boolean);
    this.notify({ kind: 'dependencies' });
  }

  setResources(rs) {
    this.resources = rs.map(normalizeResource).filter(Boolean);
    this.notify({ kind: 'resources' });
  }

  setBaselines(bs) {
    this.baselines = bs.map(normalizeBaseline).filter(Boolean);
    this.notify({ kind: 'baselines' });
  }

  upsertTask(task) {
    const norm = normalizeTask(task);
    if (!norm) return null;
    const idx = this.tasks.findIndex((t) => t.id === norm.id);
    if (idx >= 0) this.tasks[idx] = { ...this.tasks[idx], ...norm };
    else this.tasks.push(norm);
    this.scheduledTasks = null;
    this.notify({ kind: 'taskUpsert', taskId: norm.id });
    return this.tasks[idx >= 0 ? idx : this.tasks.length - 1];
  }

  removeTaskById(id) {
    const before = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== String(id));
    this.dependencies = this.dependencies.filter(
      (d) => d.from !== String(id) && d.to !== String(id),
    );
    if (this.tasks.length !== before) this.notify({ kind: 'taskRemove', taskId: String(id) });
    return before !== this.tasks.length;
  }

  upsertDependency(dep) {
    const norm = normalizeDependency(dep);
    if (!norm) return null;
    const idx = this.dependencies.findIndex((d) => d.id === norm.id);
    if (idx >= 0) this.dependencies[idx] = norm;
    else this.dependencies.push(norm);
    this.notify({ kind: 'dependencyUpsert', dependencyId: norm.id });
    return norm;
  }

  removeDependencyById(id) {
    const before = this.dependencies.length;
    this.dependencies = this.dependencies.filter((d) => d.id !== String(id));
    if (this.dependencies.length !== before) {
      this.notify({ kind: 'dependencyRemove', dependencyId: String(id) });
      return true;
    }
    return false;
  }

  applyTransaction(tx = {}) {
    const adds = tx.add || {};
    const updates = tx.update || {};
    const removes = tx.remove || {};
    if (adds.tasks) for (const t of adds.tasks) this.upsertTask(t);
    if (adds.dependencies) for (const d of adds.dependencies) this.upsertDependency(d);
    if (updates.tasks) for (const t of updates.tasks) this.upsertTask(t);
    if (updates.dependencies) for (const d of updates.dependencies) this.upsertDependency(d);
    if (removes.taskIds) for (const id of removes.taskIds) this.removeTaskById(id);
    if (removes.dependencyIds) for (const id of removes.dependencyIds) this.removeDependencyById(id);
    this.notify({ kind: 'transaction' });
  }

  serialize() {
    return {
      tasks: this.tasks.map((t) => taskToWireFormat(t)),
      dependencies: this.dependencies.map(depToWireFormat),
      resources: this.resources.map((r) => ({ ...r })),
      baselines: this.baselines.map(baselineToWireFormat),
      calendars: deepClone(this.calendars),
    };
  }
}

export function taskToWireFormat(t) {
  return {
    id: t.id,
    parentId: t.parentId,
    name: t.name,
    start: toISO(t.start),
    end: toISO(t.end),
    duration: t.durationRaw,
    effort: t.effort && (t.effort.days || t.effort.seconds) ? `${t.effort.days}d ${t.effort.seconds}s`.trim() : null,
    progress: t.progress,
    actualStart: toISO(t.actualStart),
    actualEnd: toISO(t.actualEnd),
    milestone: t.milestone,
    summary: t.summary,
    collapsed: t.collapsed,
    locked: t.locked,
    color: t.color,
    textColor: t.textColor,
    classNames: t.classNames || null,
    constraintType: t.constraintType,
    constraintDate: toISO(t.constraintDate),
    calendarId: t.calendarId,
    resourceIds: t.resourceIds,
    assignments: t.assignments,
    cost: t.cost,
    budgetedCost: t.budgetedCost,
    priority: t.priority,
  };
}

export function depToWireFormat(d) {
  return {
    id: d.id,
    from: d.from,
    to: d.to,
    type: d.type,
    lag: d.lag && (d.lag.days || d.lag.seconds)
      ? `${d.lag.days}d ${d.lag.seconds}s`.trim()
      : null,
    color: d.color,
    hard: d.hard,
  };
}

export function baselineToWireFormat(b) {
  return {
    id: b.id,
    name: b.name,
    capturedAt: toISO(b.capturedAt),
    tasks: b.tasks.map((t) => ({
      id: t.id,
      start: toISO(t.start),
      end: toISO(t.end),
      progress: t.progress,
    })),
  };
}
