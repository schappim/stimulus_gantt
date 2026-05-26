// CPM scheduler — forward pass + backward pass + slack + critical-path.
//
// Pure JS. Input: tasks + dependencies (already normalised by model.js).
// Output: per-task { earlyStart, earlyFinish, lateStart, lateFinish, slack,
// critical } and the global criticalTaskIds set.
//
// Honours dependency types FS / SS / FF / SF + lag. Year/month durations
// in lag are flattened to days for the pass (calendars provide the true
// working-time arithmetic — call sites use `addBusinessDuration` to walk
// through non-working spans).

import { addDays, MS } from './date.js';
import { durationToSeconds, parseDuration } from './duration.js';

const SECOND = 1000;
const DAY = 86_400_000;

export function scheduleProject(store) {
  const tasks = store.tasks;
  const deps = store.dependencies;
  if (!tasks.length) {
    return { byId: new Map(), criticalTaskIds: new Set(), projectStart: null, projectEnd: null };
  }

  // Build maps.
  const taskById = new Map();
  for (const t of tasks) taskById.set(t.id, t);

  // Inbound + outbound adjacency.
  const inbound = new Map();
  const outbound = new Map();
  for (const t of tasks) { inbound.set(t.id, []); outbound.set(t.id, []); }
  for (const d of deps) {
    if (!taskById.has(d.from) || !taskById.has(d.to)) continue;
    inbound.get(d.to).push(d);
    outbound.get(d.from).push(d);
  }

  // Topological order using Kahn's algorithm (cycle-safe — cycles fall
  // back to insertion order so the chart still renders).
  const remaining = new Map();
  for (const t of tasks) remaining.set(t.id, inbound.get(t.id).length);
  const queue = [];
  for (const t of tasks) if (remaining.get(t.id) === 0) queue.push(t.id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const d of outbound.get(id)) {
      const r = remaining.get(d.to) - 1;
      remaining.set(d.to, r);
      if (r === 0) queue.push(d.to);
    }
  }
  if (order.length !== tasks.length) {
    // Unprocessed tasks → cycle; append in original order.
    for (const t of tasks) if (!order.includes(t.id)) order.push(t.id);
  }

  // Forward pass.
  const result = new Map();
  for (const t of tasks) {
    result.set(t.id, {
      earlyStart: t.start ? t.start.getTime() : null,
      earlyFinish: t.end ? t.end.getTime() : (t.start ? t.start.getTime() : null),
      lateStart: null,
      lateFinish: null,
      slack: 0,
      critical: false,
    });
  }

  for (const id of order) {
    const t = taskById.get(id);
    const row = result.get(id);
    const baseStart = t.start ? t.start.getTime() : null;
    const baseFinish = t.end ? t.end.getTime() : (baseStart ?? null);
    const durMs = (baseStart != null && baseFinish != null)
      ? Math.max(0, baseFinish - baseStart)
      : durationToSeconds(t.duration ?? {}) * SECOND;

    let earlyStart = baseStart;
    for (const d of inbound.get(id)) {
      const pred = result.get(d.from);
      if (!pred || pred.earlyStart == null) continue;
      const lagMs = durationToSeconds(d.lag) * SECOND;
      let candidate = null;
      switch (d.type) {
        case 'FS': candidate = (pred.earlyFinish ?? pred.earlyStart) + lagMs; break;
        case 'SS': candidate = (pred.earlyStart ?? 0) + lagMs; break;
        case 'FF': candidate = (pred.earlyFinish ?? pred.earlyStart) + lagMs - durMs; break;
        case 'SF': candidate = (pred.earlyStart ?? 0) + lagMs - durMs; break;
      }
      if (candidate != null && (earlyStart == null || candidate > earlyStart)) {
        earlyStart = candidate;
      }
    }
    row.earlyStart = earlyStart;
    row.earlyFinish = earlyStart != null ? earlyStart + durMs : null;
  }

  // Project finish = max earlyFinish.
  let projectFinish = null;
  for (const r of result.values()) {
    if (r.earlyFinish != null && (projectFinish == null || r.earlyFinish > projectFinish)) {
      projectFinish = r.earlyFinish;
    }
  }
  let projectStart = null;
  for (const r of result.values()) {
    if (r.earlyStart != null && (projectStart == null || r.earlyStart < projectStart)) {
      projectStart = r.earlyStart;
    }
  }

  // Backward pass.
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const t = taskById.get(id);
    const row = result.get(id);
    const durMs = (row.earlyFinish != null && row.earlyStart != null)
      ? Math.max(0, row.earlyFinish - row.earlyStart)
      : durationToSeconds(t.duration ?? {}) * SECOND;

    let lateFinish = projectFinish;
    if (outbound.get(id).length === 0) {
      lateFinish = projectFinish;
    } else {
      let best = null;
      for (const d of outbound.get(id)) {
        const succ = result.get(d.to);
        if (!succ) continue;
        const lagMs = durationToSeconds(d.lag) * SECOND;
        const succDur = succ.earlyFinish != null && succ.earlyStart != null
          ? Math.max(0, succ.earlyFinish - succ.earlyStart) : 0;
        let candidate = null;
        switch (d.type) {
          case 'FS': candidate = (succ.lateStart ?? succ.earlyStart) - lagMs; break;
          case 'SS': candidate = (succ.lateStart ?? succ.earlyStart) - lagMs + durMs; break;
          case 'FF': candidate = (succ.lateFinish ?? succ.earlyFinish) - lagMs; break;
          case 'SF': candidate = (succ.lateFinish ?? succ.earlyFinish) - lagMs + durMs - succDur; break;
        }
        if (candidate != null && (best == null || candidate < best)) best = candidate;
      }
      lateFinish = best ?? projectFinish;
    }
    row.lateFinish = lateFinish;
    row.lateStart = lateFinish != null ? lateFinish - durMs : null;
    row.slack = (row.lateStart != null && row.earlyStart != null)
      ? Math.round((row.lateStart - row.earlyStart) / DAY * 100) / 100 // days, 2dp
      : 0;
  }

  // Critical = slack ≤ tolerance.
  const tolerance = 0;
  const criticalTaskIds = new Set();
  for (const [id, row] of result.entries()) {
    row.critical = row.slack != null && row.slack <= tolerance;
    if (row.critical) criticalTaskIds.add(id);
  }

  return {
    byId: result,
    criticalTaskIds,
    projectStart: projectStart != null ? new Date(projectStart) : null,
    projectEnd: projectFinish != null ? new Date(projectFinish) : null,
  };
}

// Free / total slack for one task. `total` = lateStart - earlyStart;
// `free` = min(succ.earlyStart - this.earlyFinish - lag) across successors.
export function computeTaskSlack(taskId, store) {
  const sched = scheduleProject(store);
  const row = sched.byId.get(String(taskId));
  if (!row) return { total: 0, free: 0, late_start: null, late_finish: null };
  let free = row.slack;
  const me = row;
  const outbound = store.dependencies.filter((d) => d.from === String(taskId));
  for (const d of outbound) {
    const succ = sched.byId.get(d.to);
    if (!succ || succ.earlyStart == null || me.earlyFinish == null) continue;
    const lagMs = durationToSeconds(d.lag) * 1000;
    let slackToSucc = null;
    switch (d.type) {
      case 'FS': slackToSucc = succ.earlyStart - me.earlyFinish - lagMs; break;
      case 'SS': slackToSucc = succ.earlyStart - me.earlyStart - lagMs; break;
      case 'FF': slackToSucc = succ.earlyFinish - me.earlyFinish - lagMs; break;
      case 'SF': slackToSucc = succ.earlyFinish - me.earlyStart - lagMs; break;
    }
    if (slackToSucc != null) {
      const slackDays = slackToSucc / DAY;
      if (free == null || slackDays < free) free = slackDays;
    }
  }
  return {
    total: row.slack,
    free,
    late_start: row.lateStart != null ? new Date(row.lateStart) : null,
    late_finish: row.lateFinish != null ? new Date(row.lateFinish) : null,
  };
}

// Reflow successors of a task that just moved. Returns a transaction array
// of `{ id, start, end }` updates. Honours `strict` policy by returning
// `{ conflict: true, taskId, reason }` instead.
export function reflowSuccessors(rootTaskId, store, { strategy = 'forward' } = {}) {
  const updates = [];
  const visited = new Set();
  const queue = [rootTaskId];
  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    const outbound = store.dependencies.filter((d) => d.from === id);
    const predTask = store.tasks.find((t) => t.id === id);
    if (!predTask?.start || !predTask?.end) continue;
    for (const d of outbound) {
      const succ = store.tasks.find((t) => t.id === d.to);
      if (!succ) continue;
      const lagMs = durationToSeconds(d.lag) * 1000;
      const succDurMs = succ.start && succ.end ? succ.end - succ.start : durationToSeconds(succ.duration ?? {}) * 1000;
      let newStart;
      switch (d.type) {
        case 'FS': newStart = new Date(predTask.end.getTime() + lagMs); break;
        case 'SS': newStart = new Date(predTask.start.getTime() + lagMs); break;
        case 'FF': newStart = new Date(predTask.end.getTime() + lagMs - succDurMs); break;
        case 'SF': newStart = new Date(predTask.start.getTime() + lagMs - succDurMs); break;
        default: continue;
      }
      const moveForward = !succ.start || newStart > succ.start;
      const moveBackward = succ.start && newStart < succ.start;
      const apply =
        strategy === 'both' ? (moveForward || moveBackward)
          : strategy === 'strict' ? moveForward
          : moveForward;
      if (apply) {
        const newEnd = new Date(newStart.getTime() + succDurMs);
        if (strategy === 'strict' && succ.constraintType === 'mustStartOn' && succ.constraintDate
          && newStart.getTime() !== succ.constraintDate.getTime()) {
          return { conflict: true, taskId: succ.id, reason: 'mustStartOn violated', attempted: { start: newStart, end: newEnd } };
        }
        updates.push({ id: succ.id, start: newStart, end: newEnd });
        succ.start = newStart;
        succ.end = newEnd;
      }
      queue.push(d.to);
    }
  }
  return { updates };
}
