# stimulus_gantt — API reference

The full method surface on `element.ganttApi`. Available after the
`gantt:ready` event.

```js
chart.addEventListener('gantt:ready', (e) => {
  const api = e.detail.api; // === chart.ganttApi
});
```

All dates are JS `Date` objects on the way in or ISO strings on the way
out (`getTaskData()` returns `'2026-06-01T00:00:00Z'`-style strings).

## Data

| Method | Notes |
|---|---|
| `setTaskData(tasks)` | Replaces the task array. Triggers `gantt:taskDataChanged`. |
| `getTaskData()` | Returns the normalised tasks as wire-format objects. |
| `setDependencyData(deps)` | Replace the dependency array. |
| `getDependencyData()` | Wire-format deps. |
| `setResourceData(rs)` | Replace resources. |
| `getResourceData()` | Returns the resource list. |
| `setBaselineData(bs)` | Replace baselines. |
| `getBaselineData()` | Returns baselines (with ISO dates). |
| `applyTransaction({ add, update, remove })` | Apply mixed task + dep + resource changes atomically. |

## Per-row mutation

| Method | Notes |
|---|---|
| `addTask(task, { parentId, atIndex })` | Returns the new id. Fires `gantt:taskAdded`. |
| `updateTask(task)` | Upsert by `id`. |
| `removeTaskById(id)` | Fires `gantt:taskRemoved`. |
| `addDependency(dep)` | Returns the new id. Fires `gantt:dependencyAdded`. |
| `removeDependencyById(id)` | Fires `gantt:dependencyRemoved`. |
| `moveTask(id, { parentId, toIndex })` | Re-parent and/or reorder. |
| `indentTask(id)` / `outdentTask(id)` | WBS depth changes. |

## Scheduling

| Method | Notes |
|---|---|
| `reschedule(id, { start, end, duration })` | Set start/end without firing the full pipeline. |
| `scheduleProject()` | Returns `{ byId, criticalTaskIds, projectStart, projectEnd }`. |
| `setTaskProgress(id, value)` | Clamped to `0..1`. Fires `gantt:taskProgressChanged`. |
| `setTaskConstraint(id, { type, date })` | One of `mustStartOn`, `mustFinishOn`, `startNoEarlierThan`, … |

## Selection

| Method | Notes |
|---|---|
| `getSelectedTaskIds()` / `getSelectedTasks()` |  |
| `selectTask(id)` / `deselectTask(id)` / `clearSelection()` | Fires `gantt:taskSelectionChanged`. |
| `selectRange(fromId, toId)` | Walks WBS order. |
| `getSelectedDependencyIds()` |  |

## View / zoom

| Method | Notes |
|---|---|
| `setView(view)` | `"hour"` \| `"day"` \| `"week"` \| `"month"` \| `"quarter"` \| `"year"`. |
| `getView()` |  |
| `zoomIn()` / `zoomOut()` / `zoomTo(view)` | Steps through `VIEW_ORDER`. |
| `setColumnWidth(px)` |  |
| `fitProject()` | Fit visible window to all tasks. |
| `scrollToTask(id, { align })` | Aligns to the task's start. |
| `scrollToDate(date)` |  |
| `getVisibleRange()` | `{ start, end, view }`. |

## Sidebar

| Method | Notes |
|---|---|
| `setSidebarColumns(cols)` / `getSidebarColumns()` | See `REQUIREMENTS.md §5`. |
| `setSidebarWidth(px)` / `setSidebarCollapsed(bool)` |  |
| `setColumnVisible(field, bool)` / `moveColumn(field, toIndex)` |  |
| `setSortField(field, dir)` / `setGroupBy(field)` / `getGroupBy()` | Fire `gantt:groupChanged`. |

## Tree

| Method | Notes |
|---|---|
| `expandTask(id)` / `collapseTask(id)` |  |
| `expandAll()` / `collapseAll()` |  |
| `expandToLevel(n)` | All summary nodes at depth ≥ `n` collapse. |

## Critical path

| Method | Notes |
|---|---|
| `setCriticalPath(bool)` | Fires `gantt:criticalPathRecomputed`. |
| `getCriticalPathIds()` | Returns `string[]`. |
| `getTaskSlack(id)` | `{ total, free, late_start, late_finish }` (days, +Date). |

## Baselines

| Method | Notes |
|---|---|
| `captureBaseline({ id, name })` | Returns the new baseline id. Fires `gantt:baselineCaptured`. |
| `setActiveBaseline(id)` |  |
| `clearBaseline(id)` |  |

## Filter & search

| Method | Notes |
|---|---|
| `setQuickFilter(q)` / `getQuickFilter()` | Substring against `name` + `id` + every string field. |
| `setTaskFilter(predicate)` / `getTaskFilter()` | Optional predicate hook. |

## Hit testing

| Method | Notes |
|---|---|
| `taskFromPoint(x, y)` | Returns the normalised task or `null`. |
| `dateFromPoint(x, y)` | Returns a `Date` mapped via the current view. |
| `rowFromPoint(x, y)` | Returns the WBS row index. |

## Drag programmatic

| Method | Notes |
|---|---|
| `beginDragTask(id, { mode })` | Programmatic begin — bypasses pointer events. |
| `endDrag({ commit, newStart, newEnd })` | Commit or cancel the in-progress drag. |

## Persistence

| Method | Notes |
|---|---|
| `getGanttState()` | Same shape `localStorage` stores. |
| `applyGanttState(state)` |  |
| `clearPersistedState()` | Removes the `localStorage` entry. |

## Export

| Method | Notes |
|---|---|
| `getDataAsJson()` | Single document with everything. |
| `getDataAsCsv({ columns })` | Flat row-per-task. |
| `getDataAsMsProjectXml()` | Subset MS Project understands. |
| `setTaskDataFromMsProjectXml(xml)` | Round-trip + re-render. |
| `printToPdf({ scale, paperSize, fitWidth })` | Calls `window.print()`. |
| `exportImage({ format, range })` | SVG snapshot of the chart. |

## Detail panel

| Method | Notes |
|---|---|
| `openTaskDetail(id)` | Clones `<template id="task-detail-tpl">` and appends. |
| `closeTaskDetail()` | Fires `gantt:taskDetailClosed`. |
