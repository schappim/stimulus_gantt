# stimulus_gantt — Requirements

A specification for **`stimulus_gantt`**: the Gantt-chart analog of
[`stimulus_calendar`](../stimulus_calendar) and
[`stimulus_kanban`](../stimulus_kanban). Same philosophy, same shipping
vehicles (npm IIFE/ESM + Rails gem), same HTML-first contract — but the
primitive is a **task-bar timeline with dependency arrows and a
work-breakdown sidebar** instead of an event calendar or a column board.

The goal of this document is to nail down scope and the public API surface
*before* any code is written, so the JS package, the demos, and the Rails
companion gem all converge on one mental model.

---

## 1. Mission

> An **HTML-first Gantt chart for [Stimulus.js](https://stimulus.hotwired.dev/) (Hotwire)**.
> Drop `data-controller="gantt"` on a `<div>`, describe tasks, dependencies,
> milestones, baselines and resource assignments with `data-*` attributes,
> and you get a working Gantt — WBS sidebar, draggable + resizable task
> bars, link/arrow editing, critical-path highlighting, baseline overlay,
> milestones, summary rollups, calendar (working time) awareness, zoom
> (hour → year), virtualised rows for 10k-task plans, multi-select bulk
> reschedule, a public `ganttApi` — no React, no build-time config object,
> no third-party scheduling framework.
> With the optional [`stimulus_gantt_rails`](#19-rails--hotwire-stimulus_gantt_rails)
> companion, every drag / link / progress edit also **streams live to every
> connected client over Turbo Streams** (Action Cable) — optimistic updates,
> server-side scheduling validation, and undo/redo included.

The HTML is the source of truth: a `stimulus_gantt` chart is a real
semantic `<ol>` of tasks (the WBS) that renders without JS and
progressively enhances. The exact same DOM that the server emits is the
DOM that the controller takes over — no shadow DOM, no client-only "real
model" that diverges from what's on the page.

### Non-goals (v1)

- Calendar / month-view rendering of tasks (use
  [`stimulus_calendar`](../stimulus_calendar) for event-style views).
- Kanban / status-column boards (use
  [`stimulus_kanban`](../stimulus_kanban)).
- A full PM workflow engine — approvals, change requests, time tracking
  beyond `actualStart` / `actualEnd` / `percentComplete`. The chart
  *shows* the plan; business rules live in the host app (validate in
  `task:beforeUpdate`, or on the server in the Rails companion).
- PERT / probabilistic scheduling (3-point estimates). The scheduler is
  deterministic CPM by design.
- An automatic resource-leveller. The chart surfaces overallocation
  (red bands on the resource axis) and exposes a hook
  (`gantt:overallocationDetected`) so the host can run its own
  leveller and call `applyTransaction`.
- Cost / earned-value (EVM) reporting. Per-task `cost` and `budgetedCost`
  are first-class data fields and exported with `getDataAsCsv`, but the
  chart does not render an S-curve or EVM dashboard out of the box.

---

## 2. HTML contract

The minimum boot:

```html
<link rel="stylesheet" href="dist/stimulus_gantt.css" />

<div data-controller="gantt"
     data-gantt-view-value="week"
     data-gantt-row-height-value="32"
     style="height: 640px">
  <ol class="sg-tasks">
    <li data-task-id="1"
        data-task-name="Design"
        data-task-start="2026-06-01"
        data-task-end="2026-06-05"
        data-task-progress="0.4"></li>
    <li data-task-id="2"
        data-task-name="Build"
        data-task-start="2026-06-08"
        data-task-end="2026-06-19"
        data-task-progress="0"
        data-task-depends-on="1"></li>
    <li data-task-id="3"
        data-task-name="Launch"
        data-task-start="2026-06-22"
        data-task-milestone="true"
        data-task-depends-on="2"></li>
  </ol>
</div>

<script src="dist/stimulus_gantt.js"></script>
<script>StimulusGantt.start()</script>
```

Tasks can be:

- **Server-rendered** as above (parsed into the dataset on connect — the
  HTML wins, the JS hydrates).
- **Loaded from a URL** via `data-gantt-task-source-value="/tasks.json"`
  (one fetch, single JSON document
  `{ tasks: [...], dependencies: [...], resources: [...], baselines: [...] }`).
- **Set imperatively** via `element.ganttApi.setTaskData([...])`,
  `setDependencyData([...])`, `setResourceData([...])`.

### Task body markup

A task row is *any* element with `data-task-id` inside the WBS `<ol>`.
The default renderer paints the bar and the row label from the dataset.
To opt into a registered renderer for the **label column**, set
`data-task-renderer="<name>"` on the task or
`data-gantt-task-renderer-value="<name>"` on the chart root. The **bar
itself** uses a separate renderer registry, opted into via
`data-task-bar-renderer="<name>"` or
`data-gantt-bar-renderer-value="<name>"` — so a task can have a
"phase-summary" label *and* a "progress-stripe" bar.

---

## 3. Gantt attributes (`data-gantt-*-value`)

| Attribute | Meaning |
|---|---|
| `task-source` | URL returning `{ tasks, dependencies, resources, baselines }` |
| `dependency-source` | URL returning just the dependency list (when split from tasks) |
| `resource-source` | URL returning the resource list |
| `view` | Initial timeline scale: `"hour"`, `"day"`, `"week"`, `"month"`, `"quarter"`, `"year"` |
| `views` | JSON map of per-view overrides (`{ "week": { columnWidth: 64 } }`) |
| `date` | Anchor date for the visible window (default: today) |
| `range-start` / `range-end` | Force the visible window (overrides `date`-based auto-fit) |
| `auto-fit-range` | `"tasks"` (default — span the project), `"viewport"`, or `false` |
| `column-width` | Pixel width per time-axis cell (default depends on view) |
| `row-height` | Pixel height per WBS row (default `32`) |
| `header-height` | Pixel height of the time-axis header (default `48`, doubles when two header tiers are shown) |
| `sidebar-width` | Pixel width of the WBS sidebar (default `320`) |
| `sidebar-columns` | JSON array of sidebar column defs (see §5) |
| `sidebar-collapsed` | render the WBS sidebar in collapsed state (icon-only) |
| `first-day` | 0–6 first day of week (default `1` = Mon) |
| `non-working-days` | JSON array of weekday numbers shaded as non-working (default `[0, 6]`) |
| `holidays` | JSON array of ISO date strings shaded as non-working |
| `working-hours` | JSON `{ start: "09:00", end: "17:00" }` — gates auto-scheduling and timeline shading in hour/day views |
| `calendar` | Calendar id to apply project-wide; resource/task overrides win (see §11) |
| `calendars` | JSON registry of named calendars (`{ id, weekdays, holidays, hours }`) |
| `time-zone` | `"local"`, `"UTC"`, or a named IANA TZ (e.g. `"Australia/Sydney"`) |
| `locale` | `Intl` locale tag |
| `today` | Override "today" for screenshots / fixtures |
| `now-indicator` | `true` (default) — vertical "now" line on the timeline |
| `task-selection` | `""` \| `"single"` \| `"multiple"` |
| `task-multi-select-with-click` | multi-select on plain click (no modifier) |
| `suppress-task-click-selection` | don't select on task-bar click |
| `editable` | master switch — drag, resize, link, progress (default `false`) |
| `task-start-editable` / `task-duration-editable` / `task-progress-editable` | per-affordance overrides of `editable` |
| `task-link-editable` | allow creating/removing dependency arrows by dragging from a task's end-cap |
| `snap-duration` | drag/resize/link snap resolution (default = the active view's slot) |
| `auto-schedule` | `true` (default) — pushing a predecessor reflows downstream tasks through dependency types; `false` leaves successors in place |
| `auto-schedule-strategy` | `"forward"` (push only) \| `"both"` (push or pull) \| `"strict"` (push and refuse if it breaks a constraint) |
| `critical-path` | `true` to highlight the CPM critical chain |
| `baseline` | `"hidden"` (default) \| `"overlay"` (ghost bar above each task) \| `"compare"` (side-by-side rows) |
| `baseline-id` | Which baseline to render when more than one is loaded |
| `progress-display` | `"bar"` (inset stripe, default) \| `"label"` (`%` text) \| `"both"` \| `"none"` |
| `dependency-routing` | `"orthogonal"` (default — right-angled connectors) \| `"smooth"` (bezier) \| `"straight"` |
| `dependency-color` | CSS colour for arrows; per-dep `color` wins |
| `summary-rollup` | `true` (default) — summary tasks recompute span + progress from their children |
| `row-virtualization` / `row-virtual-threshold` | force row virtualisation / auto-on row-count threshold (default `200`) |
| `column-virtualization` | virtualise the timeline columns past the visible window (default `true`) |
| `wbs-numbering` | `true` to inject `1`, `1.1`, `1.2`, … in front of task names |
| `quick-filter` | initial value of the global task search |
| `read-only` | disable every editing affordance |
| `persist-key` | when non-empty, auto-save/restore zoom, scroll, sidebar widths, column visibility, expand/collapse, sort, quick filter to `localStorage["sgantt:" + persistKey]` |
| `add-task` | `true` to render the inline "+ Add task" affordance in the sidebar |
| `add-dependency-affordance` | `true` to show the end-cap drag handle that creates a new link |
| `broadcast` / `broadcast-channel` / `broadcast-filter` | live-sync transport (see §17) |
| `print-mode` | `"fit-to-page"` \| `"actual-size"` — switches CSS for `@media print` and the export path |
| `accept-files` | drag-to-attach: dropping files on a task dispatches `gantt:fileAttached` |

---

## 4. Task attributes (`data-task-*`)

Tasks are rows in the WBS list. The minimum is `data-task-id`, plus
either `data-task-start` and `data-task-end` (or `data-task-duration`),
or `data-task-milestone="true"` (zero-duration). Summary tasks set
`data-task-summary="true"` and contain nested `<ol>` children.

| Attribute | Meaning |
|---|---|
| `data-task-id` | Stable identity |
| `data-task-parent-id` | Parent task id (for flat lists; nested `<ol>` is the alternative) |
| `data-task-name` | Display text in the sidebar |
| `data-task-start` | ISO start (date or date-time) |
| `data-task-end` | ISO end (date or date-time) — exclusive |
| `data-task-duration` | Duration string (`"5d"`, `"08:00"`, `90` seconds) — used when `end` is absent |
| `data-task-effort` | Work in person-hours (drives auto-scheduling against the assigned calendar) |
| `data-task-progress` | `0..1` — drawn as the inset stripe |
| `data-task-actual-start` / `data-task-actual-end` | Recorded actuals (drawn under the planned bar with a thin overlay) |
| `data-task-milestone` | `"true"` for a diamond marker |
| `data-task-summary` | `"true"` for a summary bar (span + progress rolled up from children) |
| `data-task-collapsed` | `"true"` to start with its children hidden |
| `data-task-locked` | `"true"` to forbid drag, resize, link, progress |
| `data-task-color` | Per-task bar colour |
| `data-task-text-color` | Per-task bar text colour |
| `data-task-class-names` | Extra classes on the row + bar |
| `data-task-constraint-type` | One of `mustStartOn`, `mustFinishOn`, `startNoEarlierThan`, `startNoLaterThan`, `finishNoEarlierThan`, `finishNoLaterThan`, `asSoonAsPossible` (default), `asLateAsPossible` |
| `data-task-constraint-date` | ISO date the constraint anchors at |
| `data-task-calendar-id` | Override the project / resource calendar |
| `data-task-resource-ids` | JSON array of resource ids assigned to this task |
| `data-task-cost` | Numeric — exported / rolled up in `getDataAsCsv` |
| `data-task-budgeted-cost` | Numeric baseline cost |
| `data-task-priority` | Integer; surfaced to the host (e.g. for a custom leveller) |
| `data-task-renderer` | Per-task label renderer override |
| `data-task-bar-renderer` | Per-task bar renderer override |
| `data-task-json` | Single JSON payload — alternative to enumerating every attribute |

The rest of a task's data lives in attributes on its descendants (same
binding model as the kanban / grid: `data-bind`, `data-bind-text`,
`data-bind-attr`) or in `data-task-json` for renderers that prefer one
object.

A task can also be **synthetic** (e.g. an auto-generated project root, or
a grouping row from `groupBy`): synthetic rows set
`data-synthetic="true"` and are excluded from `getTaskData()` and
persistence.

---

## 5. Sidebar (WBS) columns

The sidebar is a configurable mini-grid that scrolls vertically in sync
with the timeline. Columns are declared via
`data-gantt-sidebar-columns-value` (JSON array) or pushed at runtime via
`setSidebarColumns([...])`.

Each column has the shape:

```json
{
  "field": "name",
  "header": "Task",
  "width": 220,
  "renderer": "task-name-with-indent",
  "editor": "text",
  "frozen": true,
  "align": "left",
  "sort": "asc"
}
```

Built-in columns shipped pre-registered: `wbs` (numbering),
`name`, `start`, `end`, `duration`, `effort`, `progress`,
`resources`, `predecessors`, `actual-start`, `actual-end`,
`baseline-start`, `baseline-end`, `slack`, `critical`,
`cost`, `priority`, `status` (derived from progress + dates), and
`indicators` (icons for attachments, notes, recurrence, conflict, late).

The sidebar supports:

- **Resize** of columns (persisted via `persist-key`).
- **Reorder** (drag the header).
- **Inline edit** for built-in editor types `text`, `number`,
  `duration`, `date`, `progress`, `resources` (chip-picker),
  `predecessors` (chip-picker over task ids with FS/SS/FF/SF + lag).
- **Sort** per column (re-sorts the WBS; disabled when the parent has
  manual ordering via `data-task-order`).
- **Group** by any field (`setGroupBy('resource_id')` → injects
  synthetic group rows; collapse / expand persisted).

---

## 6. Dependencies (`data-dependency-*`)

Dependencies are children of `<ol class="sg-dependencies">` inside the
chart root, or supplied via the task source's `dependencies` array, or
set imperatively via `setDependencyData([...])`.

```html
<ol class="sg-dependencies" hidden>
  <li data-dependency-id="d1"
      data-dependency-from="1"
      data-dependency-to="2"
      data-dependency-type="FS"
      data-dependency-lag="0d"></li>
</ol>
```

| Attribute | Meaning |
|---|---|
| `data-dependency-id` | Stable identity |
| `data-dependency-from` | Predecessor task id |
| `data-dependency-to` | Successor task id |
| `data-dependency-type` | `"FS"` (default, finish-to-start), `"SS"`, `"FF"`, `"SF"` |
| `data-dependency-lag` | Duration string — positive = lag, negative = lead |
| `data-dependency-color` | Per-arrow colour override |
| `data-dependency-class-names` | Extra classes for the SVG path |
| `data-dependency-hard` | `"true"` to block the user from deleting this arrow |

Arrows render as SVG paths in an overlay above the timeline, routed
according to `dependency-routing`. Hovering an arrow highlights its
endpoints; clicking selects it; Delete removes it (firing
`gantt:beforeDependencyRemove`, then `gantt:dependencyRemoved`).

---

## 7. Resources & assignments

Resources are people, teams, machines, or rooms a task consumes. They
power:

- **Resource chips** in the sidebar `resources` column.
- **Per-resource colour bands** along the bar (`data-bar-renderer="resource-stripes"`).
- **Overallocation detection** (red shading on a per-resource band in
  the optional **resource histogram** panel — see §13).
- **Calendar overrides** (a resource's calendar wins over the project
  calendar; the task calendar wins over both).

```json
[
  { "id": "u1", "name": "Alex",  "calendar": "fulltime", "capacity": 1.0,
    "color": "#3b82f6" },
  { "id": "u2", "name": "Sam",   "calendar": "parttime", "capacity": 0.5,
    "color": "#10b981" },
  { "id": "u3", "name": "Robot", "calendar": "247",      "capacity": 5.0 }
]
```

Assignment shape (per-task array `resourceIds`, or richer array for
per-assignment units):

```json
[ { "resource_id": "u1", "units": 0.5 },
  { "resource_id": "u2", "units": 1.0 } ]
```

---

## 8. Public API — `element.ganttApi`

Available after the `gantt:ready` event. Highlights:

- **Data:** `setTaskData(tasks)`, `getTaskData()`,
  `setDependencyData(deps)`, `getDependencyData()`,
  `setResourceData(rs)`, `getResourceData()`,
  `setBaselineData(bs)`, `getBaselineData()`,
  `applyTransaction({add, update, remove})` (mixed task + dependency +
  resource changes in one atomic redraw)
- **Per-row mutation:** `addTask(task, { parentId, atIndex })`,
  `updateTask(task)`, `removeTaskById(id)`,
  `addDependency(dep)`, `removeDependencyById(id)`,
  `moveTask(id, { parentId, toIndex })`,
  `indentTask(id)` / `outdentTask(id)`
- **Scheduling:** `reschedule(id, { start, end, duration })`,
  `scheduleProject()` (full forward-pass + critical-path recompute),
  `setTaskProgress(id, value)`, `setTaskConstraint(id, { type, date })`
- **Selection:** `getSelectedTaskIds()`, `getSelectedTasks()`,
  `selectTask(id)`, `deselectTask(id)`,
  `selectRange(fromId, toId)`, `clearSelection()`,
  `getSelectedDependencyIds()`
- **View / zoom:** `setView(viewName)`, `getView()`,
  `zoomIn()` / `zoomOut()` / `zoomTo(view)`,
  `setColumnWidth(px)`, `fitProject()`, `scrollToTask(id, { align })`,
  `scrollToDate(date)`, `getVisibleRange()`
- **Sidebar:** `setSidebarColumns(cols)`, `getSidebarColumns()`,
  `setSidebarWidth(px)`, `setSidebarCollapsed(bool)`,
  `setColumnVisible(field, bool)`, `moveColumn(field, toIndex)`,
  `setSortField(field, dir)`, `setGroupBy(field)`, `getGroupBy()`
- **Tree:** `expandTask(id)` / `collapseTask(id)`,
  `expandAll()` / `collapseAll()`, `expandToLevel(n)`
- **Critical path:** `setCriticalPath(bool)`,
  `getCriticalPathIds()`, `getTaskSlack(id)`
- **Baselines:** `captureBaseline({ id, name })` (snapshot current plan),
  `setActiveBaseline(id)`, `clearBaseline(id)`
- **Filter & search:** `setQuickFilter(q)`, `getQuickFilter()`,
  `setTaskFilter(predicate)`, `getTaskFilter()`
- **Bar / row hit testing:** `taskFromPoint(x, y)`,
  `dateFromPoint(x, y)`, `rowFromPoint(x, y)`
- **Drag programmatic:** `beginDragTask(id, { mode })` (`"move"` /
  `"resize-start"` / `"resize-end"` / `"link"`),
  `endDrag({ commit: bool, newStart, newEnd })` — wraps the same
  pipeline as a real pointer drag, so tests skip synthetic pointer
  events
- **Persistence:** `getGanttState()`, `applyGanttState(state)`,
  `clearPersistedState()`
- **Export:** `getDataAsJson()`, `getDataAsCsv({ columns })`,
  `getDataAsMsProjectXml()`, `printToPdf({ scale, paperSize, fitWidth })`
- **Detail panel:** `openTaskDetail(id)` / `closeTaskDetail()` —
  popover or right-rail cloned from a `<template id="task-detail-tpl">`
  (same template contract as the kanban + grid)

---

## 9. Events (dispatched on the chart element)

All events bubble. Each one carries enough data in `detail` for an undo
log entry, so a host app can keep its own audit trail without re-querying
state.

| Event | `detail` |
|---|---|
| `gantt:ready` | `{ api }` |
| `gantt:taskDataChanged` | `{ tasks }` |
| `gantt:dependencyDataChanged` | `{ dependencies }` |
| `gantt:resourceDataChanged` | `{ resources }` |
| `gantt:viewChanged` | `{ view, columnWidth }` |
| `gantt:visibleRangeChanged` | `{ start, end, view }` |
| `gantt:taskClicked` | `{ taskId, task, originalEvent }` |
| `gantt:taskDblClicked` | `{ taskId, task, originalEvent }` |
| `gantt:taskSelectionChanged` | `{ selectedTaskIds }` |
| `gantt:dependencySelectionChanged` | `{ selectedDependencyIds }` |
| `gantt:taskHovered` | `{ taskId, task }` |
| `gantt:dependencyHovered` | `{ dependencyId, dependency }` |
| `gantt:beforeUpdate` | `{ taskId, change }` — **cancellable** with `preventDefault()`; host hook for workflow rules |
| `gantt:taskMoved` | `{ taskId, oldStart, newStart, oldEnd, newEnd, delta }` |
| `gantt:taskResized` | `{ taskId, edge, oldStart, oldEnd, newStart, newEnd }` |
| `gantt:taskProgressChanged` | `{ taskId, oldValue, newValue }` |
| `gantt:taskReparented` | `{ taskId, fromParentId, toParentId, toIndex }` |
| `gantt:taskAdded` / `gantt:taskRemoved` | `{ taskId, task }` |
| `gantt:beforeDependencyAdd` / `gantt:beforeDependencyRemove` | cancellable |
| `gantt:dependencyAdded` / `gantt:dependencyRemoved` | `{ dependencyId, dependency }` |
| `gantt:criticalPathRecomputed` | `{ criticalTaskIds }` |
| `gantt:overallocationDetected` | `{ resourceId, intervals: [{ start, end, units }] }` |
| `gantt:baselineCaptured` | `{ baselineId, name }` |
| `gantt:scheduleConflict` | `{ taskId, reason, attempted }` — fired when `auto-schedule-strategy="strict"` refuses a change |
| `gantt:groupChanged` | `{ groupBy }` |
| `gantt:filterChanged` | `{ quickFilter, predicate }` |
| `gantt:taskDetailOpened` / `gantt:taskDetailClosed` | `{ taskId, task, panelEl }` |
| `gantt:fileAttached` | `{ taskId, files, task, dataTransfer }` — cancellable |
| `gantt:broadcast:out` / `gantt:broadcast:in` | `{ message }` |

```js
chart.addEventListener("gantt:ready", (e) => e.detail.api.setTaskData(tasks))
chart.addEventListener("gantt:beforeUpdate", (e) => {
  if (e.detail.change.newEnd > sprintEnd) e.preventDefault()
})
chart.addEventListener("gantt:taskMoved", (e) => save(e.detail))
```

---

## 10. Custom renderers & editors (via `<template>`)

Same shape as `stimulus_kanban` / `stimulus_grid`, with two registries
(sidebar label vs. bar) and a dedicated milestone slot.

```html
<template id="phase-row">
  <div class="sg-row phase">
    <span class="sg-wbs" data-bind="wbs"></span>
    <strong class="sg-name" data-bind="name"></strong>
    <span class="sg-meta" data-bind-text="duration"></span>
  </div>
</template>

<template id="progress-stripe-bar">
  <div class="sg-bar progress-stripe"
       data-bind-attr="style:--progress:progress">
    <span class="sg-bar-label" data-bind="name"></span>
  </div>
</template>

<template id="diamond-milestone">
  <svg viewBox="0 0 16 16" class="sg-milestone">
    <polygon points="8,0 16,8 8,16 0,8"
             data-bind-attr="fill:color"></polygon>
  </svg>
</template>

<template id="task-editor">
  <form class="sg-task-editor">
    <input data-editor-input data-editor-field="name" />
    <input type="date" data-editor-field="start" />
    <input type="date" data-editor-field="end" />
    <input type="range" min="0" max="1" step="0.05" data-editor-field="progress" />
    <button data-editor-commit>Save</button>
    <button data-editor-cancel type="button">Cancel</button>
  </form>
</template>

<div data-controller="gantt"
     data-gantt-task-renderer-value="phase-row"
     data-gantt-bar-renderer-value="progress-stripe-bar"
     data-gantt-milestone-renderer-value="diamond-milestone"
     data-gantt-task-editor-value="task-editor">…</div>
```

- **Sidebar / bar / milestone renderers**: clone the template per task.
  `data-bind="field"` → text = `task.field`; `data-bind-text` → formatted;
  `data-bind-attr` → set attribute (multi-attr supported with
  `style:--progress:progress` style syntax to write CSS custom properties).
- **Editor**: clones on edit. Inputs marked
  `[data-editor-field="<f>"]` are seeded from the task and read back into
  `{ field: value }` on commit. Enter / Tab commit, Esc cancels.
- A separate **dependency renderer** registry lets a host swap the SVG
  arrow shape (e.g. `"dashed"`, `"thick-arrow"`, `"labelled"`).

---

## 11. Working time, calendars & holidays

Scheduling honours a **calendar** — a set of weekdays, working hours,
and holiday dates that decide when work can happen. Calendars are
declared in `data-gantt-calendars-value` and referenced by id from the
chart, resources, and individual tasks.

```json
{
  "fulltime":  { "weekdays": [1,2,3,4,5], "hours": [["09:00","17:00"]] },
  "parttime":  { "weekdays": [2,4],       "hours": [["10:00","14:00"]] },
  "247":       { "weekdays": [0,1,2,3,4,5,6], "hours": [["00:00","24:00"]] },
  "default":   { "weekdays": [1,2,3,4,5], "hours": [["09:00","12:30"],["13:30","17:00"]],
                 "holidays": ["2026-12-25","2026-12-26"] }
}
```

Resolution order: **task calendar → resource calendar → project calendar**.
Non-working time is shaded across the whole timeline (`non-working-days`,
`holidays`) and, in hour/day views, also gates the
`working-hours` shading. Auto-scheduling and drag/resize snap *across*
non-working spans so a 2-day task dragged onto Friday lands on Tuesday by
default.

`addBusinessDuration(date, dur, calendar)` and
`durationBetween(a, b, calendar)` are exposed from the library entry
point for hosts that need to compute outside the chart.

---

## 12. Critical path, slack & baselines

- **Critical path** (`critical-path="true"` or `setCriticalPath(true)`):
  the chart runs a CPM forward / backward pass over the task graph,
  flags zero-slack tasks (within `criticalSlackTolerance`, default
  `0`), and adds `data-critical="true"` + a red rail. Recomputed on
  every dataset mutation, debounced 16 ms.
- **Slack** is exposed per task via `getTaskSlack(id)` →
  `{ total, free, late_start, late_finish }`, and rendered as a thin
  hatched extension beyond the bar when
  `data-gantt-show-slack-value="true"`.
- **Baselines**: capture the current plan with
  `captureBaseline({ id: "v1", name: "Kickoff" })`. The snapshot is a
  frozen copy of `{ start, end, progress }` per task. With
  `baseline="overlay"` a translucent grey bar is painted *above* each
  current bar; with `baseline="compare"` the rows split horizontally —
  baseline above, current below. Multiple baselines coexist; pick one
  via `baseline-id`.

---

## 13. Resource histogram (optional panel)

Toggle with `data-gantt-resource-histogram-value="true"`. Renders a
collapsible panel below the chart with one row per resource:

- **Allocation bars** sum every assignment by day/week/whatever the
  active view is.
- **Capacity line** at the resource's `capacity` (1.0 = full-time).
- **Overallocation segments** shade red and fire
  `gantt:overallocationDetected` (debounced — one event per
  contiguous interval, not per slot).

The histogram subscribes to the same data store as the chart; mutating
a task in the chart reflows the histogram on the next animation frame
without a refetch.

---

## 14. Drag, drop, keyboard, multi-select

- **Pointer drag** is pointer-events based — works on touch, pen and
  mouse. Three drag modes per bar:
  1. **Move** — body of the bar; moves start *and* end together.
  2. **Resize start** / **Resize end** — leading / trailing edge
     handles (configurable via `resize-handle-width`, default `8px`).
  3. **Link** — circular end-cap that appears on hover (when
     `task-link-editable`); drag to a target task's body to create a
     `FS` dependency, or its leading edge for `SS`.
- **Auto-scroll** kicks in near chart edges (both horizontal — timeline
  — and vertical — sidebar) at configurable speed.
- **Drag preview** shows the new start/end ISO date in a tooltip pill
  anchored to the cursor.
- **Cancel** with Esc *during* drag — fires `gantt:beforeUpdate` with
  `cancelled: true` and reverts the optimistic DOM.
- **Multi-task drag**: `Cmd/Ctrl+click` adds to selection; dragging any
  selected bar moves the whole set as a *rigid* group (preserving
  relative offsets). Linked dependencies travel with the group.
- **Multi-select bulk reschedule**: with multiple tasks selected,
  pressing `←/→` shifts every selection by `snapDuration`.
- **Keyboard nav**:
  - `↑/↓` move active row in the WBS;
  - `←/→` scroll the timeline by one column;
  - `Cmd/Ctrl+←/→` shift the active task by `snapDuration` (fires
    `gantt:beforeUpdate` → `gantt:taskMoved`);
  - `Tab` / `Shift+Tab` indent / outdent;
  - `Enter` opens the task detail / editor;
  - `Space` toggles selection;
  - `Cmd/Ctrl+A` selects all visible tasks;
  - `+` / `-` zoom in / out;
  - `Cmd/Ctrl+C` / `Cmd/Ctrl+V` copy / paste tasks as JSON;
  - `Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z` undo / redo (when the host has
    enabled it via `enableUndoRedo({ stackSize })`).

---

## 15. Filter, search, sort, group

- **Quick filter** (`data-gantt-quick-filter-value` or `setQuickFilter`)
  matches against the task's name + all string fields; non-matching
  rows are visually dimmed *or* hidden (`data-gantt-filter-mode-value`:
  `"dim"` vs `"hide"`; default `"hide"`). Hiding preserves summary
  parents whose descendants match.
- **Predicate filter** (`setTaskFilter(task => boolean)`) for
  app-driven rules ("only my tasks", "tasks due this week").
- **Sort** is configured on sidebar columns (`sort: "asc"|"desc"`)
  *or* programmatically via `setSortField`. Sorting respects the
  parent/child tree by default (siblings sort within their parent);
  pass `setSortField(field, dir, { flatten: true })` to ignore the
  tree.
- **Group by** any task field → `setGroupBy("resource_id")` injects
  synthetic group rows (collapsible, persisted). Groups appear *above*
  the WBS hierarchy; collapsing a group hides the whole sub-tree.

---

## 16. Persistence

`persist-key` round-trips through `localStorage["sgantt:" + key]`. The
snapshot covers:

- view name + column width + sidebar width + sidebar collapsed state;
- sidebar column order, widths, visibility, sort, group-by;
- expand / collapse state per task id;
- quick-filter string;
- active baseline id + baseline display mode;
- critical-path on/off + slack on/off;
- read-only toggle;
- scroll position (`scrollLeft`, `scrollTop`) — session-scoped, off by
  default.

It deliberately **does not** persist the task data itself (the host /
server is the source of truth).

Writes debounced 200 ms, flushed on `beforeunload`. Restore broadcasts
one `gantt:ganttStateApplied` event after layout.

---

## 17. Live broadcasting (transport-agnostic core)

Same broadcast bus as `stimulus_calendar`'s, generalised to the Gantt
mutation shape (`taskAdd`, `taskUpdate`, `taskRemove`, `dependencyAdd`,
`dependencyRemove`, `bulk`). Adapters ship for:

- `turbo-stream` — `<turbo-stream action="gantt-task-{add,update,remove}">`
  + `gantt-dependency-{add,remove}` + `gantt-bulk` + `gantt-conflict`
  custom actions over Action Cable; the Rails gem (§19) wires this
  end-to-end.
- `action-cable` — direct channel subscription, no Turbo Stream wrapper.
- `websocket` — raw WebSocket, server format defined by your app.
- `broadcast-channel` — `window.BroadcastChannel` for tab-to-tab sync
  within a single browser (great for demos, no server needed).

Echo suppression by `origin` id; conflict policy is **last-write-wins
by task id** (overridable via the `ganttBroadcastResolve` callback).
Outbound dispatches go through `gantt:broadcast:out` so a host can
inspect / mutate / cancel a message before it leaves; inbound arrive on
`gantt:broadcast:in`.

---

## 18. Virtual scrolling

Two axes get virtualised independently:

- **Rows** — past `row-virtual-threshold` (default `200`) the WBS
  recycles row DOM nodes on scroll. Variable row heights fall back to
  the cheaper "measure-then-mount" path for that row only.
- **Columns** — the timeline past the visible window is rendered as
  empty spacers; bars wholly outside the viewport are not mounted, but
  *partially* visible bars are. Dependency arrows track virtualisation
  by routing through anchor points on the visible bar ends + the chart
  edges, so an off-screen predecessor still routes to a visible
  successor (and the arrow draws to the chart edge with a small "off
  screen" affordance).

Drag works against the virtual viewport: dragging a bar off-screen
auto-scrolls and resolves the drop date against the logical timeline,
not the rendered window.

---

## 19. Rails & Hotwire (`stimulus_gantt_rails`)

A Rails engine, parallel to `stimulus_calendar_rails`. Turns the chart
into a **server-driven, multi-user editable** Gantt over Turbo Streams
+ Action Cable.

**Capabilities**

- **Live multi-user edits** — every move / resize / link /
  progress-change broadcasts task-grained (or dependency-grained) Turbo
  Stream actions to all connected tabs.
- **Optimistic edits** — a dragged bar pulses pending (blue),
  reconciles green / reverts red; `X-Optimistic-Id` echo-suppression
  for the originator.
- **Server-side task registry** — per-field `type`, `editable`,
  `validate`, `concurrency`.
- **Server-side scheduling** — the Rails class can run the CPM forward
  pass server-side (deterministic, single source of truth) and echo
  back computed `early_start` / `early_finish` / `slack` per task.
- **Server-side calendar registry** — declare project / resource
  calendars in Ruby; the gem ships matching JSON to the browser.
- **Workflow hooks** — `before_update(task, change:, user:)` raises to
  veto; clients see `gantt:beforeUpdate` → `revert` round-trip.
- **Concurrency** — version-checked moves (`lock_version` → conflict
  revert), per-field validation.
- **Bulk operations** — multi-task reschedule, indent / outdent,
  bulk-assign-resource, undo/redo backed by a server-side audit log
  (`Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`).
- **Multi-tenancy & auth** — tenant-scoped streams (ActsAsTenant),
  scoped task lookups, auth inherited from `parent_controller`.
- **Scale** — server-side global search, server-side row windowing for
  50–100K+ task plans (the JS row virtualiser drives a fetch on
  scroll, same shape as the kanban / grid server-side mode).

**Install (sketch)**

```bash
bundle add stimulus_gantt_rails
```

```js
// app/javascript/application.js
import "@hotwired/turbo-rails"
import { Application } from "@hotwired/stimulus"
import StimulusGantt from "stimulus_gantt"
import StimulusGanttRails from "stimulus_gantt_rails"

const application = Application.start()
StimulusGantt.start(application)        // gantt, gantt-sidebar, gantt-bar, …
StimulusGanttRails.start(application)   // gantt-sync + Turbo Stream actions
```

```ruby
# config/routes.rb
mount ActionCable.server => "/cable"
mount StimulusGanttRails::Engine => StimulusGanttRails.mount_path # default "/gantts"
```

```ruby
# app/gantts/project_gantt.rb
class ProjectGantt < StimulusGanttRails::Gantt
  resource :tasks
  model    Task

  field :name,            type: :string,   editable: true
  field :start,           type: :datetime, editable: true, concurrency: :version_checked
  field :end,             type: :datetime, editable: true, concurrency: :version_checked
  field :duration,        type: :duration, editable: true
  field :progress,        type: :float,    editable: true,
                          validate: ->(v, _) { "must be 0..1" unless (0.0..1.0).cover?(v.to_f) }
  field :resource_ids,    type: :array,    editable: ->(_t, user) { user&.lead? }
  field :constraint_type, type: :enum,     values: %i[asap alap mso mfo snlt fnet], editable: true

  dependency_types %i[FS SS FF SF]

  calendar :default do
    weekdays [1, 2, 3, 4, 5]
    hours    [["09:00", "17:00"]]
    holidays Date.parse("2026-12-25"), Date.parse("2026-12-26")
  end

  before_update ->(task, change:, user:) {
    raise StimulusGanttRails::Veto, "Outside sprint" if change[:start] && change[:start] > Sprint.current.ends_at
  }
end
```

```ruby
# app/models/task.rb
class Task < ApplicationRecord
  include StimulusGanttRails::Broadcastable
  broadcasts_gantt ProjectGantt, stream: ->(_t) { "project:#{Current.project.id}" }
  self.locking_column = :lock_version
end
```

```erb
<%= render partial: "stimulus_gantt_rails/gantts/gantt",
           locals: { gantt: ProjectGantt.new(user: current_user),
                     tasks: Task.in_project(@project).order(:parent_id, :position),
                     dependencies: Dependency.in_project(@project),
                     resources: User.assignable,
                     view: "week",
                     task_selection: "multiple" } %>
```

Undo/redo + audit log opt-in via the bundled migration
(`bin/rails stimulus_gantt_rails:install:migrations && bin/rails db:migrate`).

---

## 20. Import / export

- **JSON** — `getDataAsJson()` / `setTaskData(...)`: the canonical
  round-trip format. Single document with `tasks`, `dependencies`,
  `resources`, `baselines`, `calendars`.
- **CSV** — `getDataAsCsv({ columns })`: flat row-per-task, with
  predecessor encoding `"3FS+2d, 5SS"` in the standard PM convention.
- **MS Project XML** — `getDataAsMsProjectXml()` /
  `setTaskDataFromMsProjectXml(xml)`: lossless for tasks, dependencies,
  calendars, resources, baselines (the subset MS Project uses);
  documented round-trip caveats in `docs/MSPROJECT.md`.
- **PDF** — `printToPdf({ scale, paperSize, fitWidth })`: client-side
  `window.print()` with a `@media print` stylesheet by default; the
  Rails gem ships an optional server-side renderer (`Grover`-based) for
  multi-page wide projects.
- **PNG / SVG snapshot** — `exportImage({ format: "png"|"svg",
  range: "visible"|"project" })`: rasterises the timeline + sidebar
  to a single image (the SVG path is what `scripts/screenshot.mjs`
  uses for the docs).

---

## 21. Distribution

Same three install paths as the calendar / kanban:

- **Option A — plain `<script>`**: self-contained IIFE bundle with
  Stimulus included; CDN-loadable. `dist/stimulus_gantt.js` +
  `dist/stimulus_gantt.css`.
- **Option B — npm + bundler**: `npm install @ninjaai/stimulus_gantt
  @hotwired/stimulus`; Stimulus is a peer dependency.
  `StimulusGantt.start(app?)` registers all controllers and returns
  the application.
- **Option C — Rails / Hotwire (gem)**: `bundle add stimulus_gantt_rails`;
  importmap pins auto-registered, CSS shipped from the engine, no JS
  build step.

Stimulus controllers registered: `gantt`, `gantt-sidebar`,
`gantt-bar`, `gantt-dependency`, `gantt-row`, `gantt-task-editor`,
`gantt-toolbar`, `gantt-histogram`, `gantt-detail-panel`. (Mirrors the
`calendar` + per-view satellite set in `stimulus_calendar`.)

---

## 22. Project layout (target)

```
stimulus_gantt/
├── README.md
├── DESIGN.md                      # architecture + full API reference
├── REQUIREMENTS.md                # this file
├── PLAN.md                        # per-feature migration / build checklist
├── RAILS.md                       # Hotwire-Native Gantt build checklist
├── CHANGELOG.md
├── LICENSE
├── package.json
├── vite.config.js                 # demo dev server
├── vite.lib.config.js             # IIFE + ESM bundle
├── vitest.config.js
├── src/
│   ├── index.js
│   ├── controllers/
│   │   ├── gantt_controller.js
│   │   ├── gantt_sidebar_controller.js
│   │   ├── gantt_bar_controller.js
│   │   ├── gantt_dependency_controller.js
│   │   ├── gantt_toolbar_controller.js
│   │   ├── gantt_histogram_controller.js
│   │   └── gantt_task_editor_controller.js
│   ├── lib/
│   │   ├── api.js                 # public ganttApi
│   │   ├── dom.js                 # DOM helpers, drag overlay
│   │   ├── model.js               # task / dependency / resource reducers
│   │   ├── schedule.js            # CPM forward+backward pass, slack
│   │   ├── calendar.js            # working-time arithmetic
│   │   ├── dnd.js                 # pointer drag (move/resize/link), auto-scroll
│   │   ├── virtual.js             # row + column virtualisation
│   │   ├── arrows.js              # SVG dependency routing
│   │   ├── renderers.js           # built-in label / bar / milestone renderers
│   │   ├── export.js              # JSON / CSV / MS Project XML / PDF
│   │   └── broadcast/             # transport-agnostic live sync
│   ├── views/
│   │   ├── hour.js
│   │   ├── day.js
│   │   ├── week.js
│   │   ├── month.js
│   │   ├── quarter.js
│   │   └── year.js
│   └── styles/
│       └── stimulus_gantt.css
├── dist/                          # built artefacts (gitignored except for releases)
├── demo/                          # 30+ HTML pages, vite-served
│   ├── 01-basic.html
│   ├── 02-json-data.html
│   ├── 03-zoom-views.html
│   ├── 04-drag-move-resize.html
│   ├── 05-dependency-arrows.html
│   ├── 06-create-link-by-drag.html
│   ├── 07-critical-path.html
│   ├── 08-baseline-overlay.html
│   ├── 09-baseline-compare.html
│   ├── 10-milestones.html
│   ├── 11-summary-rollup.html
│   ├── 12-wbs-sidebar-columns.html
│   ├── 13-inline-edit-sidebar.html
│   ├── 14-grouping-by-resource.html
│   ├── 15-resource-histogram.html
│   ├── 16-overallocation.html
│   ├── 17-calendar-non-working-time.html
│   ├── 18-multi-calendar-resources.html
│   ├── 19-virtual-10k-tasks.html
│   ├── 20-multi-select-bulk-reschedule.html
│   ├── 21-quick-filter.html
│   ├── 22-persisted-state.html
│   ├── 23-print-pdf.html
│   ├── 24-ms-project-xml-import.html
│   ├── 25-broadcast-two-tabs.html
│   ├── 26-task-detail-popover.html
│   ├── 27-task-detail-rail.html
│   ├── 28-custom-bar-renderer.html
│   ├── 29-keyboard-nav.html
│   └── …
├── test/                          # Vitest specs
│   ├── model.spec.js
│   ├── schedule.spec.js           # CPM correctness
│   ├── calendar.spec.js           # working-time arithmetic
│   ├── dnd.spec.js
│   ├── arrows.spec.js
│   ├── api.spec.js
│   ├── renderers.spec.js
│   ├── virtual.spec.js
│   ├── export.spec.js
│   └── broadcast_e2e.spec.js
├── docs/
│   ├── BROADCAST.md
│   ├── MSPROJECT.md
│   ├── REFERENCE.md
│   ├── RAILS_REFERENCE.md
│   └── images/                    # README screenshots
├── scripts/
│   ├── screenshot.mjs
│   └── screenshot-gif.mjs
├── bin/
│   └── sync-rails-assets
├── gem/
│   ├── stimulus_gantt_rails/      # the Rails engine
│   │   ├── app/
│   │   ├── config/
│   │   ├── db/migrate/            # opt-in audit log
│   │   ├── lib/stimulus_gantt_rails/
│   │   ├── stimulus_gantt_rails.gemspec
│   │   └── README.md
│   └── demo/                      # runnable Rails app
└── skills/
    ├── stimulus-gantt-js/         # LLM-oriented usage skill
    └── stimulus-gantt-rails/
```

---

## 23. Tests & CI

- **JS**: Vitest covers the model (task / dep / resource reducers),
  the **CPM scheduler** (forward + backward pass, slack, critical
  path against known fixtures), the **calendar arithmetic** (working
  time across DST, holidays, multi-shift), the `ganttApi`, the
  renderers, the dependency arrow router, virtualisation, and the DnD
  state machine via the `beginDragTask` / `endDrag` programmatic
  harness (no synthetic pointer events needed).
- **Rails engine**: `bin/rails test` covers models, channel actions,
  Turbo Stream payloads, audit log, before-update vetoes, concurrency
  conflicts, server-side scheduling parity (the server's CPM result
  must equal the client's for the shared fixture set), and tenant
  isolation.
- Both run on every push / PR via GitHub Actions, same matrix as
  `stimulus_calendar`.

---

## 24. Acceptance criteria for v1

A v1 ships when:

1. **HTML-first contract.** A server-rendered `<ol>` of tasks (and an
   optional `<ol class="sg-dependencies">`) is fully usable with JS
   disabled — task names, dates and progress are visible as plain text
   in the sidebar, no bars but no errors.
2. **Six views** (`hour`, `day`, `week`, `month`, `quarter`, `year`)
   all render with correct headers, today highlight, non-working
   shading, and now-indicator (when applicable).
3. **Drag, resize, link, progress** all work on desktop pointer +
   touch; multi-task drag preserves relative offsets; cancellable
   `gantt:beforeUpdate`; auto-scroll on chart edges; date-tooltip
   anchored to the cursor.
4. **Keyboard parity** for everything drag does, plus WBS nav,
   indent / outdent, zoom.
5. **Dependencies**: FS / SS / FF / SF arrow rendering with all three
   routing modes; create-by-drag and delete-by-select-then-Delete;
   cancellable `gantt:beforeDependencyAdd`.
6. **Auto-scheduling**: pushing a predecessor reflows successors per
   dependency type + lag; `strict` mode refuses + fires
   `gantt:scheduleConflict`.
7. **Critical path**: CPM forward + backward pass over the task graph;
   highlighted in red; recomputes within one frame of any mutation.
8. **Baselines**: overlay *and* compare layouts both ship; multiple
   baselines coexist; capture + switch via `ganttApi`.
9. **Calendars**: per-task / per-resource / per-project calendars
   compose; non-working time visibly shaded; drag snaps over
   non-working spans by default.
10. **Sidebar (WBS)**: 18 built-in columns shipped, resizable,
    reorderable, sortable, inline-editable; group-by injects
    synthetic group rows.
11. **Renderers**: separate label, bar, milestone, and dependency
    registries; custom `<template>` path documented; at least 8
    built-in bar renderers (`progress-stripe`, `resource-stripes`,
    `summary`, `phase`, `milestone-diamond`, `flag`, `chevron`,
    `actual-vs-planned`).
12. **Resource histogram** panel toggles in, overallocation segments
    fire `gantt:overallocationDetected` exactly once per contiguous
    interval.
13. **Virtualisation** kicks in automatically over the row / column
    thresholds; demo at 10k tasks scrolls at 60 fps on a 2026 laptop.
14. **Quick filter + per-column sort + group-by + persisted state**
    all working and round-tripping through `localStorage` with one
    `persist-key`.
15. **Server-side task model**: one fetch per viewport-window;
    scroll-to-load; server-assigned task position on move; server-side
    CPM result echoed back.
16. **Export**: JSON, CSV, MS Project XML, PDF (client `print`),
    PNG / SVG snapshot — all round-trip with the documented fixture.
17. **Rails companion gem** ships parallel to JS package,
    importmap-pinned, publishes Turbo Stream actions on every
    move / resize / link / progress edit; demo app in `gem/demo`
    covers a 50-task project plan with two resources, real
    dependencies, and a baseline — end-to-end.
18. **Demos**: 25+ HTML pages, vite-served, covering each capability
    above plus the broadcast-two-tabs and 10k-task scale demos.
19. **Tests** green on CI for both the JS package and the Rails
    engine; the CPM scheduler matches a published reference fixture
    (e.g. the FullCalendar / Bryntum / MS Project sample plan).
20. **Docs**: `README.md` follows the `stimulus_calendar` shape
    (Install, Quick start, Gantt attributes, Task / Dependency /
    Resource attributes, Public API, Events, Renderers, Calendars,
    Critical path / Baselines, Rails section), `DESIGN.md` covers
    the model reducers + scheduler + DnD state machine,
    `docs/MSPROJECT.md` documents the import / export mapping,
    `skills/` holds two LLM usage guides (JS, Rails).
