# stimulus_gantt — Design

The chart is composed of three concentric layers. From innermost to outer:

```
                  Store (lib/model.js)
                       │
                       ▼
                  Reducers + index
                       │
        ┌──────────────┼──────────────────┐
        ▼              ▼                  ▼
    Scheduler       Renderers         DnD state
    (schedule.js)   (renderers.js)    (dnd.js)
        │              │                  │
        └──────────────┴────────┬─────────┘
                                ▼
                       GanttController
                       (Stimulus host)
                                │
                                ▼
                            ganttApi
                       (lib/api.js)
                                │
                                ▼
                            Application
```

The Store is pure JS — no DOM, no Stimulus. It can be unit-tested in
isolation (and is — see `test/model.test.js`). The Stimulus controller is
the only piece that touches the DOM; everything else is a function of
Store state + view config.

## Modules

### `lib/model.js`

- `Store` — the single source of truth (tasks, dependencies, resources,
  baselines, calendars, selection, collapsed-set).
- `normalizeTask` / `normalizeDependency` / `normalizeResource` —
  parse mixed inputs (DOM datasets OR plain objects OR
  `data-task-json` blobs) into a single normalised shape.
- `buildTaskIndex` — flat ordered list with depth + path (used by the
  WBS renderer and the export helpers).
- `rollupSummary` — computed-from-children span + progress.
- `taskToWireFormat` / `depToWireFormat` / `baselineToWireFormat` —
  serialise back out for `ganttApi.getTaskData()`, the Rails companion,
  CSV, MS Project XML.

The Store fires plain notifications (`store.subscribe(fn)`), not events —
the *controller* re-emits Stimulus events from those notifications. This
keeps the store framework-agnostic and means we can run the scheduler
against it from a test or a worker.

### `lib/schedule.js`

Classic Critical-Path Method, deterministic, no probabilistic 3-point
estimation. One forward pass + one backward pass:

1. **Topological sort** — Kahn's algorithm, cycle-safe (cycles fall
   back to insertion order so the chart still renders).
2. **Forward pass** — `earlyStart` / `earlyFinish` per task, honouring
   dependency type + lag.
3. **Backward pass** — `lateStart` / `lateFinish` against the project
   finish.
4. **Slack** = `lateStart - earlyStart`; critical = slack ≤ tolerance.

`reflowSuccessors(rootTaskId, store, { strategy })` walks the dependency
graph forward and returns `{ updates: [{ id, start, end }, ...] }`. The
`"strict"` strategy returns `{ conflict, taskId, reason }` instead of
applying when a constraint is violated.

### `lib/calendar.js`

`normalizeCalendar(raw)` produces:

```js
{ id, weekdays: [1,2,3,4,5], hours: [['09:00','17:00']], holidays: [...] }
```

`addBusinessDuration(date, dur, calendar)` walks the calendar forward or
backward by the given working duration, stepping over weekends and
holidays. `durationBetween(a, b, calendar)` returns the working seconds
between two timestamps.

Resolution order from the controller: **task → resource → project →
24×7 fallback**.

### `lib/dnd.js`

A tiny pointer-event state machine. Three modes — `move`,
`resize-start`, `resize-end` — plus an explicit `link` mode for
drag-to-create-dependency.

- `begin({ taskId, mode, originalEvent, originStart, originEnd })`
- `commit(e)` / `cancel(e)` — wired to `pointerup` / `pointercancel` /
  `keydown:Escape`.
- `beginProgrammatic(...)` + `updateProgrammatic(...)` for tests and
  the public `beginDragTask` API — no synthetic pointer events.

Auto-scroll near chart edges runs off `requestAnimationFrame`.

### `lib/arrows.js`

`buildArrowPath({ from, to, fromSide, toSide, routing })` produces an
SVG `d` string. Three routing modes:

- `orthogonal` (default) — right-angled connectors with a single mid
  bend (or a "wrap" path when the successor is left of the
  predecessor).
- `smooth` — cubic Bezier.
- `straight` — a single line segment.

`dependencyAnchors(predRect, succRect, type)` picks the two anchor
points for `FS` / `SS` / `FF` / `SF`.

### `lib/virtual.js`

Two windowing helpers (`rowWindow`, `columnWindow`) used by the
controller's render loop. They return `{ startIndex, endIndex,
paddingTop, paddingBottom }` and let the controller render only the
visible slice while preserving correct total height via spacer divs.

### `lib/renderers.js`

Four registries: label / bar / milestone / dependency. Each name maps
to a `(task, ctx) → DOM Node` function. Built-ins live alongside; hosts
register their own via `registerBarRenderer(name, fn)` etc.

A `template` renderer name in every registry indicates "use the named
`<template>` and apply `data-bind` / `data-bind-text` / `data-bind-attr`
to clone it." This keeps a host-driven extension path that needs zero
JS.

### `lib/export.js`

- `exportJson(store)` — `{ tasks, dependencies, resources, baselines,
  calendars }`.
- `exportCsv(store, { columns })` — flat row-per-task; predecessors
  encoded `"3FS+2d, 5SS"` in the standard PM convention.
- `exportMsProjectXml(store)` / `importMsProjectXml(xml)` — lossy
  round-trip suitable for the standard `<Project><Tasks>...</Tasks>`
  document shape.

### `lib/broadcast/`

The broadcast bus is transport-agnostic. Each adapter (`turbo_stream`,
`action_cable`, `broadcast_channel`, `websocket`) implements
`{ send, onReceive, close }`; `BroadcastBus` tags every outbound message
with a per-bus origin id so the originator can ignore its own echoes
when the server fans out.

Outbound payloads emitted as `gantt:broadcast:out` (`CustomEvent`) so
hosts can inspect / mutate / cancel a message before it leaves the
process. Inbound arrive on `gantt:broadcast:in`.

### `lib/api.js`

`createGanttApi(controller)` returns the `element.ganttApi` object —
every method documented in `REQUIREMENTS.md §8` lives here. Methods are
thin wrappers over the store + controller helpers; the controller
handles re-render orchestration via a throttled `rerender()` call.

### `views/*.js`

One module per zoom level. Each view exports the same five-method
shape:

- `slotMs` — millisecond width of one slot.
- `defaultColumnWidth` — px width per slot.
- `columnsBetween(start, end)` — integer count.
- `addSlots(date, n)` / `dateForSlot(slot, start)` /
  `slotForDate(date, start)` — coordinate ↔ date.
- `buildHeader(start, end)` — `{ tiers: [{ cells: [{ label, span }] }] }`.

Adding a new view (e.g. fortnight) is one file.

### `controllers/gantt_controller.js`

The Stimulus host. Owns:

- The DOM scaffolding (`sg-root`, `sg-sidebar`, `sg-timeline`,
  `sg-bars`, `sg-arrows`, `sg-non-working`, `sg-now-indicator`,
  `sg-tooltip`).
- One `Store` instance + the broadcast bus.
- The `DragController` instance (lazy-constructed on first
  `pointerdown`).
- One throttled `rerender` function — every store change triggers a
  re-render via `requestAnimationFrame`.

Render pipeline (per frame):

1. Resolve visible range (project span / `range-start`+`range-end` /
   anchor date + view width).
2. Build the header tiers via the current view module.
3. Paint non-working shading.
4. Render the sidebar (header + body, with virtualisation).
5. Render bars + rows (virtualised; partial bars at the edges still
   mount so arrows route correctly).
6. Render dependency arrows over the bar positions captured in
   step (5).
7. Now-indicator + critical-path flagging.
8. Debounce a `localStorage` write if `persist-key` is set.

### Satellite controllers

- `gantt-sidebar` — per-header-cell hooks (sort, resize, reorder).
- `gantt-bar` — per-bar hooks (popovers, custom listeners).
- `gantt-dependency` — per-arrow hooks.
- `gantt-row` — per-row hooks (context menu, drag-to-reorder).
- `gantt-toolbar` — pre-built zoom / filter toolbar.
- `gantt-histogram` — collapsible resource-allocation panel.
- `gantt-task-editor` — inline editor popover for a clicked task.
- `gantt-detail-panel` — side rail / popover bound to the current
  selection.

Each is optional and addressable independently; the main controller
runs fine without any of them.

## Persistence

`localStorage["sgantt:" + key]` round-trips:

- view name + column width + sidebar width + collapsed
- sidebar column order, widths, visibility, sort, group-by
- expand / collapse state per task id
- quick-filter string
- active baseline id + baseline display mode
- critical-path + slack toggles
- read-only toggle

It deliberately **does not** persist task data — the host / server is
the source of truth. Writes are debounced 200 ms; reads run once on
`connect`.

## Broadcasting

Adapter selection happens via `resolveAdapter(broadcast, channel,
extras)`. The bus accepts an optional `filter({ op, payload, meta })`
that runs before each outbound publish — set it via
`data-gantt-broadcast-filter-value` (JSON function source) or pass a
direct callback through programmatic registration.

The Rails companion's Turbo Stream actions land here without bouncing
through the gem code — the `turbo-stream` adapter listens for the
matching `<turbo-stream action="gantt-task-add">` etc., parses the
embedded `<template>` JSON payload and feeds it to the bus.

## Test surface

Vitest specs cover:

- `model.test.js` — normalisation, store reducers, index, rollup.
- `schedule.test.js` — CPM forward + backward over linear and parallel
  graphs; reflow + strict-mode conflicts.
- `calendar.test.js` — working-time arithmetic, holidays, weekend
  skip, working-seconds-per-day.
- `duration.test.js` / `date.test.js` — parsing edge cases.
- `arrows.test.js` — orthogonal / smooth / straight path generation.
- `virtual.test.js` — row + column windows.
- `dnd.test.js` — programmatic begin → commit / cancel.
- `renderers.test.js` — built-in registries + custom registration.
- `export.test.js` — JSON / CSV / MS Project XML round-trip.
- `views.test.js` — column counts per view.
- `api.test.js` — full controller integration via happy-dom.
- `broadcast.test.js` — bus origin tagging + echo suppression + filter.
- `index.test.js` — public surface re-exports.

Run them all with `npm test`.
