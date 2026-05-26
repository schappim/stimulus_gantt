# stimulus_gantt

> **HTML-first Gantt chart for [Stimulus.js](https://stimulus.hotwired.dev/) (Hotwire).**
> Drop `data-controller="gantt"` on a `<div>`, describe tasks, dependencies,
> milestones, baselines and resource assignments with `data-*` attributes,
> and you get a working Gantt — WBS sidebar, draggable + resizable task
> bars, dependency arrows, critical-path highlighting, baselines,
> milestones, working-time calendars, zoom (hour → year), virtualised
> rows, multi-select bulk reschedule, a public `ganttApi` — no React, no
> build-time config object, no third-party scheduling framework.

The chart is the [calendar](https://github.com/schappim/stimulus_calendar) /
[kanban](https://github.com/schappim/stimulus_kanban) /
[grid](https://github.com/schappim/stimulus_grid) sibling — same philosophy,
same shipping vehicles, same HTML-first contract.

With the optional [`stimulus_gantt_rails`](#rails--hotwire) companion, every
move / link / progress edit also **streams live to every connected client over
Turbo Streams** — optimistic updates, server-side scheduling, conflict
resolution and undo / redo included.

```
npm install @ninjaai/stimulus_gantt @hotwired/stimulus
```

```html
<link rel="stylesheet" href="dist/stimulus_gantt.css" />

<div data-controller="gantt"
     data-gantt-view-value="week"
     data-gantt-editable-value="true"
     style="height: 480px">
  <ol class="sg-tasks">
    <li data-task-id="1" data-task-name="Design"
        data-task-start="2026-06-01" data-task-end="2026-06-05"
        data-task-progress="0.4"></li>
    <li data-task-id="2" data-task-name="Build"
        data-task-start="2026-06-08" data-task-end="2026-06-19"
        data-task-depends-on="1"></li>
    <li data-task-id="3" data-task-name="Launch"
        data-task-start="2026-06-22" data-task-milestone="true"></li>
  </ol>
</div>

<script src="dist/stimulus_gantt.js"></script>
<script>StimulusGantt.start()</script>
```

That's it — the HTML is the model. The server can render it without JS; the
controller hydrates on connect.

---

## Install

**Option A — plain `<script>`:**

```html
<link rel="stylesheet" href="https://unpkg.com/@ninjaai/stimulus_gantt/dist/stimulus_gantt.css" />
<script src="https://unpkg.com/@ninjaai/stimulus_gantt/dist/stimulus_gantt.js"></script>
<script>StimulusGantt.start()</script>
```

**Option B — npm + bundler:**

```js
import { Application } from '@hotwired/stimulus';
import StimulusGantt from '@ninjaai/stimulus_gantt';
import '@ninjaai/stimulus_gantt/style.css';

const application = Application.start();
StimulusGantt.start(application);
```

**Option C — Rails / Hotwire (gem):**

```ruby
# Gemfile
gem 'stimulus_gantt_rails'
```

```ruby
# config/routes.rb
mount StimulusGanttRails::Engine => StimulusGanttRails.mount_path
```

```erb
<%= render partial: "stimulus_gantt_rails/gantts/gantt",
           locals: { gantt: ProjectGantt.new(user: current_user),
                     tasks: Task.in_project(@project),
                     dependencies: Dependency.in_project(@project) } %>
```

---

## HTML contract

A `stimulus_gantt` chart is a semantic `<ol class="sg-tasks">` of tasks. The
controller parses the list on connect, then takes over rendering of the bars
and arrows — but the `<ol>` is the data source.

```html
<div data-controller="gantt"
     data-gantt-view-value="week"
     data-gantt-row-height-value="32"
     style="height: 640px">
  <ol class="sg-tasks">
    <li data-task-id="1" data-task-name="Phase 1">
      <ol>
        <li data-task-id="1.1" data-task-name="Research"
            data-task-start="2026-06-01" data-task-end="2026-06-05"></li>
        <li data-task-id="1.2" data-task-name="Specify"
            data-task-start="2026-06-06" data-task-end="2026-06-12"></li>
      </ol>
    </li>
    <li data-task-id="2" data-task-name="Phase 2"
        data-task-start="2026-06-15" data-task-end="2026-07-05">
    </li>
  </ol>
  <ol class="sg-dependencies" hidden>
    <li data-dependency-id="d1" data-dependency-from="1" data-dependency-to="2"
        data-dependency-type="FS" data-dependency-lag="2d"></li>
  </ol>
</div>
```

Tasks can also be:

- **Loaded from a URL** via
  `data-gantt-task-source-value="/tasks.json"` (single JSON document
  `{ tasks, dependencies, resources, baselines, calendars }`).
- **Set imperatively** via `element.ganttApi.setTaskData([...])`,
  `setDependencyData([...])`, `setResourceData([...])`.

---

## Gantt attributes (`data-gantt-*-value`)

| Attribute | Meaning |
|---|---|
| `task-source` | URL returning `{ tasks, dependencies, resources, baselines }` |
| `view` | Initial timeline scale: `"hour"`, `"day"`, `"week"`, `"month"`, `"quarter"`, `"year"` |
| `date` | Anchor date for the visible window (default: today) |
| `range-start` / `range-end` | Force the visible window |
| `auto-fit-range` | `"tasks"` (default) \| `"viewport"` \| `false` |
| `column-width` | Pixel width per time-axis cell |
| `row-height` | Pixel height per WBS row (default `32`) |
| `header-height` | Pixel height of the time-axis header (default `48`) |
| `sidebar-width` | Pixel width of the WBS sidebar (default `320`) |
| `sidebar-columns` | JSON array of sidebar column defs |
| `sidebar-collapsed` | render the WBS sidebar in collapsed state |
| `first-day` | `0..6` first day of week (default `1` = Mon) |
| `non-working-days` | JSON array of weekday numbers shaded as non-working |
| `holidays` | JSON array of ISO date strings shaded as non-working |
| `working-hours` | JSON `{ start: "09:00", end: "17:00" }` |
| `calendar` | Calendar id applied project-wide |
| `calendars` | JSON registry of named calendars |
| `time-zone` | `"local"`, `"UTC"`, or an IANA tz |
| `editable` | master switch — drag, resize, link, progress (default `false`) |
| `task-link-editable` | allow creating dependency arrows by drag |
| `snap-duration` | drag / resize snap resolution |
| `auto-schedule` | `true` — pushing a predecessor reflows successors |
| `auto-schedule-strategy` | `"forward"` \| `"both"` \| `"strict"` |
| `critical-path` | highlight the CPM critical chain |
| `baseline` | `"hidden"` \| `"overlay"` \| `"compare"` |
| `progress-display` | `"bar"` \| `"label"` \| `"both"` \| `"none"` |
| `dependency-routing` | `"orthogonal"` \| `"smooth"` \| `"straight"` |
| `summary-rollup` | summary tasks recompute from their children |
| `row-virtualization` / `row-virtual-threshold` | force / auto-on row virtualisation |
| `wbs-numbering` | inject `1`, `1.1`, `1.2`, … |
| `quick-filter` | initial value of the global task search |
| `read-only` | disable editing affordances |
| `persist-key` | when set, save/restore view + filter + collapsed state |
| `broadcast` / `broadcast-channel` | live-sync transport |
| `print-mode` | `"fit-to-page"` \| `"actual-size"` |

---

## Task attributes (`data-task-*`)

| Attribute | Meaning |
|---|---|
| `data-task-id` | Stable identity (required) |
| `data-task-parent-id` | Parent task id (for flat lists) |
| `data-task-name` | Display text in the sidebar |
| `data-task-start` | ISO start (date or date-time) |
| `data-task-end` | ISO end (date or date-time) — exclusive |
| `data-task-duration` | Duration string (`"5d"`, `"08:00"`, `90` seconds) |
| `data-task-effort` | Work in person-hours |
| `data-task-progress` | `0..1` (or `0..100`) — inset stripe |
| `data-task-actual-start` / `data-task-actual-end` | Recorded actuals |
| `data-task-milestone` | `"true"` for a diamond marker |
| `data-task-summary` | `"true"` for a summary bar |
| `data-task-collapsed` | `"true"` to start collapsed |
| `data-task-locked` | `"true"` to forbid edits |
| `data-task-color` / `data-task-text-color` | Per-task colour overrides |
| `data-task-class-names` | Extra classes on the row + bar |
| `data-task-constraint-type` | One of `mustStartOn`, `mustFinishOn`, … |
| `data-task-constraint-date` | ISO date the constraint anchors at |
| `data-task-calendar-id` | Override project / resource calendar |
| `data-task-resource-ids` | JSON array of resource ids |
| `data-task-cost` / `data-task-budgeted-cost` | Numeric — exported in CSV |
| `data-task-priority` | Integer — exposed to the host |
| `data-task-renderer` / `data-task-bar-renderer` | Per-task renderer overrides |
| `data-task-json` | Single JSON payload — alternative to attribute soup |

---

## Dependency attributes (`data-dependency-*`)

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
| `data-dependency-from` | Predecessor task id |
| `data-dependency-to`   | Successor task id |
| `data-dependency-type` | `"FS"` (default), `"SS"`, `"FF"`, `"SF"` |
| `data-dependency-lag`  | Duration string (positive = lag, negative = lead) |
| `data-dependency-color`| Per-arrow colour override |
| `data-dependency-hard` | `"true"` to block deletion |

---

## Public API — `element.ganttApi`

Available after the `gantt:ready` event. See [`docs/REFERENCE.md`](docs/REFERENCE.md)
for the full list; highlights:

- **Data**: `setTaskData`, `getTaskData`, `setDependencyData`,
  `getDependencyData`, `setResourceData`, `applyTransaction`
- **Per-row mutation**: `addTask`, `updateTask`, `removeTaskById`,
  `addDependency`, `removeDependencyById`, `moveTask`, `indentTask`,
  `outdentTask`
- **Scheduling**: `reschedule`, `scheduleProject`, `setTaskProgress`,
  `setTaskConstraint`
- **Selection**: `selectTask`, `deselectTask`, `selectRange`,
  `clearSelection`, `getSelectedTaskIds`
- **View / zoom**: `setView`, `zoomIn`, `zoomOut`, `setColumnWidth`,
  `fitProject`, `scrollToTask`, `scrollToDate`, `getVisibleRange`
- **Sidebar**: `setSidebarColumns`, `setSidebarWidth`,
  `setSidebarCollapsed`, `setColumnVisible`, `moveColumn`,
  `setSortField`, `setGroupBy`
- **Tree**: `expandTask`, `collapseTask`, `expandAll`, `collapseAll`,
  `expandToLevel`
- **Critical path**: `setCriticalPath`, `getCriticalPathIds`,
  `getTaskSlack`
- **Baselines**: `captureBaseline`, `setActiveBaseline`, `clearBaseline`
- **Filter & search**: `setQuickFilter`, `setTaskFilter`
- **Drag programmatic**: `beginDragTask`, `endDrag`
- **Persistence**: `getGanttState`, `applyGanttState`, `clearPersistedState`
- **Export**: `getDataAsJson`, `getDataAsCsv`, `getDataAsMsProjectXml`,
  `setTaskDataFromMsProjectXml`, `printToPdf`
- **Detail panel**: `openTaskDetail`, `closeTaskDetail`

---

## Events

All events bubble. Each carries enough data in `detail` for an undo-log entry.

| Event | `detail` |
|---|---|
| `gantt:ready` | `{ api }` |
| `gantt:taskDataChanged` | `{ tasks }` |
| `gantt:dependencyDataChanged` | `{ dependencies }` |
| `gantt:resourceDataChanged` | `{ resources }` |
| `gantt:viewChanged` | `{ view, columnWidth }` |
| `gantt:visibleRangeChanged` | `{ start, end, view }` |
| `gantt:taskClicked` / `taskDblClicked` | `{ taskId, task, originalEvent }` |
| `gantt:taskSelectionChanged` | `{ selectedTaskIds }` |
| `gantt:beforeUpdate` | `{ taskId, change }` (cancellable) |
| `gantt:taskMoved` | `{ taskId, oldStart, newStart, oldEnd, newEnd, delta }` |
| `gantt:taskResized` | `{ taskId, edge, oldStart, oldEnd, newStart, newEnd }` |
| `gantt:taskProgressChanged` | `{ taskId, oldValue, newValue }` |
| `gantt:taskReparented` | `{ taskId, fromParentId, toParentId, toIndex }` |
| `gantt:taskAdded` / `taskRemoved` | `{ taskId, task }` |
| `gantt:beforeDependencyAdd` / `Remove` | cancellable |
| `gantt:dependencyAdded` / `Removed` | `{ dependencyId, dependency }` |
| `gantt:criticalPathRecomputed` | `{ criticalTaskIds }` |
| `gantt:overallocationDetected` | `{ resourceId, intervals }` |
| `gantt:baselineCaptured` | `{ baselineId, name }` |
| `gantt:scheduleConflict` | `{ taskId, reason, attempted }` |
| `gantt:filterChanged` / `groupChanged` | matching detail |
| `gantt:taskDetailOpened` / `Closed` | `{ taskId, task, panelEl }` |
| `gantt:broadcast:out` / `gantt:broadcast:in` | `{ message }` |

```js
chart.addEventListener("gantt:ready", (e) => e.detail.api.setTaskData(tasks));
chart.addEventListener("gantt:beforeUpdate", (e) => {
  if (e.detail.change.newEnd > sprintEnd) e.preventDefault();
});
chart.addEventListener("gantt:taskMoved", (e) => save(e.detail));
```

---

## Renderers

Three independent registries — sidebar **label**, **bar**, **milestone** —
plus a separate **dependency** renderer registry. Pre-registered renderers:

- **Bars**: `default`, `progress-stripe`, `resource-stripes`, `summary`,
  `phase`, `milestone-diamond`, `flag`, `chevron`, `actual-vs-planned`,
  `template`.
- **Milestones**: `default`, `template`.
- **Dependencies**: `default`, `dashed`.

```js
import { registerBarRenderer } from '@ninjaai/stimulus_gantt';

registerBarRenderer('annotated', (task) => {
  const el = document.createElement('div');
  el.className = 'sg-bar custom-bar';
  el.innerHTML = `<span class="sg-bar-label">${task.name}</span>`;
  return el;
});
```

Or template-driven (no JS needed):

```html
<template id="progress-stripe-bar">
  <div class="sg-bar progress-stripe"
       data-bind-attr="style:--progress:progress">
    <span class="sg-bar-label" data-bind="name"></span>
  </div>
</template>

<div data-controller="gantt"
     data-gantt-bar-renderer-value="progress-stripe-bar">
  …
</div>
```

---

## Calendars & working time

```html
<div data-controller="gantt"
     data-gantt-calendars-value='{
       "fulltime": {"weekdays":[1,2,3,4,5],"hours":[["09:00","17:00"]]},
       "parttime": {"weekdays":[2,4],       "hours":[["10:00","14:00"]]},
       "247":      {"weekdays":[0,1,2,3,4,5,6],"hours":[["00:00","24:00"]]}
     }'
     data-gantt-calendar-value="fulltime">
  …
</div>
```

Resolution order: **task calendar → resource calendar → project calendar →
24×7 fallback**.

`addBusinessDuration(date, dur, calendar)` and
`durationBetween(a, b, calendar)` are exposed from the library entry point for
hosts that need to compute outside the chart.

---

## Critical path, slack & baselines

```js
chart.ganttApi.setCriticalPath(true);                  // CPM forward + backward
chart.ganttApi.getCriticalPathIds();                   // ['1','2','5']
chart.ganttApi.getTaskSlack('3');                      // { total, free, late_start, late_finish }

chart.ganttApi.captureBaseline({ id: 'v1', name: 'Kickoff' });
chart.ganttApi.setActiveBaseline('v1');                // overlay/compare
```

---

## Rails & Hotwire

See [`gem/stimulus_gantt_rails/README.md`](gem/stimulus_gantt_rails/README.md)
and [`docs/RAILS_REFERENCE.md`](docs/RAILS_REFERENCE.md). The companion gem
provides:

- A declarative `StimulusGanttRails::Gantt` DSL for fields, calendars,
  workflow hooks, concurrency policies.
- A `Broadcastable` ActiveRecord concern that turns every `save` /
  `destroy` into a Turbo Stream action consumed by the JS bus.
- Tenant-scoped streams (ActsAsTenant), version-checked moves,
  server-side CPM scheduling.
- Optional audit log + undo/redo via a bundled migration.

```ruby
class ProjectGantt < StimulusGanttRails::Gantt
  resource :tasks
  model    Task

  field :name,            type: :string,   editable: true
  field :start,           type: :datetime, editable: true, concurrency: :version_checked
  field :end,             type: :datetime, editable: true, concurrency: :version_checked
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

---

## Demos

```sh
npm run dev                 # http://localhost:5173/demo/
```

30+ pages cover every capability — basic / JSON / six views / drag /
dependencies / critical path / baselines / milestones / summary rollup /
WBS columns / inline edit / grouping / resource histogram / overallocation
/ calendars / 10k tasks / multi-select / quick filter / persisted state /
print / MS Project XML / two-tab broadcast / custom renderer / detail
panels / keyboard / toolbar.

---

## Development

```sh
npm install
npm test                    # vitest
npm run build:lib           # IIFE + ESM bundles
npm run dev                 # vite dev server, demos at /demo/
```

---

## License

MIT. See [`LICENSE`](LICENSE).
