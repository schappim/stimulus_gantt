# stimulus_gantt — Build plan

A per-feature coverage checklist. Each box maps to a single attribute,
method, event, renderer, adapter, controller, demo or doc page in
`REQUIREMENTS.md`. The goal is bisectable progress: every checked box
should correspond to an isolated, reviewable commit that landed:

- the code (controller / lib / view / engine file),
- a Vitest spec under `test/` (and, for Rails-visible surfaces, a
  Minitest under `gem/demo/test/`),
- a demo page or screenshot exercising the feature,
- a matching docs paragraph in `README.md`, `docs/REFERENCE.md` and
  the relevant `skills/*/SKILL.md`.

## Rules of engagement

- **One commit per unchecked box.** Granularity is per individual
  attribute, method or feature — small, reviewable, bisectable.
- **Tests run on both sides where they apply.**
  - Pure JS logic → Vitest in `test/` (`npm test`).
  - JS controllers / DOM behaviour → JSDOM Vitest (`npm test`).
  - Rails integration → Minitest in `gem/demo/test/` (`cd gem/demo && bin/rails test`).
  - Any commit that touches the Rails gem OR a JS feature with a
    Rails-visible surface (tasks, dependencies, broadcasts,
    optimistic-id flow) MUST land both test types in the same commit.
- **Every user-visible feature ships a demo and a screenshot.**
  - JS-only demos under `demo/NN-…html`, linked from `demo/index.html`.
  - Rails demos under `gem/demo/app/views/…`.
  - The screenshot lives under `docs/screenshots/sg-<feature>.png` and
    is referenced from `README.md` and the matching
    `skills/*/SKILL.md`. Screenshots are captured from the running
    dev server / Rails app, not faked.
- **Docs grow with the code.** Every commit that adds or changes a
  public surface updates the matching section of:
  - `README.md`
  - `skills/stimulus-gantt-js/SKILL.md` (JS API for LLMs)
  - `skills/stimulus-gantt-rails/SKILL.md` (Rails API for LLMs)
  - `docs/REFERENCE.md` (full programmatic reference)
- **No "and also fixed X" commits.** If unrelated rot needs cleaning,
  that's a separate commit.
- Commit messages: `feat(lib): add CPM scheduler`,
  `feat(view): week header tiers`, `feat(opt): hiddenDays`,
  `feat(broadcast): turbo-stream adapter`,
  `feat(rails): broadcastable concern`, `feat(rails-gem): scaffold engine`,
  `docs(skill): document hiddenDays`, `chore(screenshot): sg-month`.

## Phase 0 — JS scaffold (done)

- [x] Project skeleton: `package.json`, `vite.config.js`,
      `vite.lib.config.js`, `vitest.config.js`,
      `src/{controllers,lib,views,styles}/`, `test/`, `demo/`,
      `.github/workflows/ci.yml`, `LICENSE`, `.gitignore`, initial
      `PLAN.md` / `REQUIREMENTS.md`.
- [x] `src/index.js` — public surface (`StimulusGantt.start`,
      `StimulusGantt.create`, `StimulusGantt.destroy`).
- [x] First green Vitest run.
- [x] Plain `<script>` IIFE build (`dist/stimulus_gantt.js`).
- [x] ESM build (`dist/stimulus_gantt.esm.js`) with `@hotwired/stimulus`
      externalised as a peer dep.
- [x] Stylesheet (`dist/stimulus_gantt.css`) emitted alongside both
      bundles.
- [x] `package.json` `exports` / `unpkg` / `jsdelivr` / `files`
      whitelist verified for npm publish.

## Phase 0a — Documentation, skills, gem skeleton, dummy Rails app

These set up the *structure* before the per-feature commits flow into
the existing files rather than inventing new layout each time.

- [x] `README.md` — mirrors stimulus_calendar: badges, hero image,
      install (Option A IIFE / Option B npm / Option C Rails gem),
      quick start with **runnable from-the-repo** instructions,
      screenshot section, attribute tables (filled per-phase), events
      list, public API, Rails section, demos, build, tests, license.
- [x] `REQUIREMENTS.md` — public spec; this PLAN.md mirrors §24.
- [x] `DESIGN.md` — module map + render pipeline.
- [x] `RAILS.md` — Hotwire-Native build checklist for hosts wiring up
      the gem.
- [x] `CHANGELOG.md` — Keep-a-Changelog skeleton.
- [x] `docs/screenshots/` — directory exists from day one so
      per-feature screenshots can drop in without scaffolding noise.
- [x] `skills/stimulus-gantt-js/SKILL.md` — frontmatter + section
      outline (setup, minimal Gantt, attributes, events, API,
      gotchas). Content fills in per-feature.
- [x] `skills/stimulus-gantt-rails/SKILL.md` — frontmatter + section
      outline (setup, declaring a `Gantt`, `Broadcastable`, render
      partial, custom Turbo Stream actions, gotchas).
- [x] `gem/stimulus_gantt_rails/` — bare engine skeleton: `gemspec`,
      `lib/stimulus_gantt_rails.rb`, `lib/stimulus_gantt_rails/version.rb`,
      `lib/stimulus_gantt_rails/engine.rb`, `config/importmap.rb`,
      `config/routes.rb`, empty `app/{assets,controllers,javascript,models,views}/`
      tree, `MIT-LICENSE`, `Rakefile`, `Gemfile`, `README.md`,
      `CHANGELOG.md`.
- [ ] `gem/demo/` — dummy Rails app generated with `rails new`,
      includes the gem `path:`-pinned, ActionCable + Turbo + Importmap,
      a `Task`, `Dependency` and `Resource` model with migrations, a
      tiny `gantts#index` view, and `bin/rails test` wired up.
- [x] `.github/workflows/ci.yml` — runs `npm ci`, `npm test`,
      `npm run build:lib` on every push / PR (Node 20). Ruby matrix
      lands when `gem/demo` does.

## Phase 1 — HTML contract & dataset hydration

The contract: a server-rendered `<ol class="sg-tasks">` (+ optional
`<ol class="sg-dependencies">`) is the source of truth. Hydration on
`connect` parses every documented `data-*` attribute into the
controller's store. Each box below is one attribute or behaviour from
`REQUIREMENTS.md §3-§6`.

### 1a — Roots & parsing

- [x] `<ol class="sg-tasks">` parsing (flat list)
- [x] `<ol class="sg-tasks">` parsing (nested `<ol>` children)
- [x] `<ol class="sg-dependencies">` parsing
- [x] Sidebar + timeline DOM scaffolding (`.sg-sidebar`, `.sg-timeline`,
      `.sg-bars`, `.sg-arrows` SVG overlay)
- [x] Default bar renderer + default label renderer
- [x] Day-view header + day-cell shading

### 1b — Gantt root attributes (`data-gantt-*-value`)

- [x] `task-source` (URL fetch on connect)
- [x] `dependency-source`
- [x] `resource-source`
- [x] `view`
- [x] `views` (per-view overrides)
- [x] `date` (anchor)
- [x] `range-start` / `range-end` (forced window)
- [x] `auto-fit-range` (`tasks` / `viewport` / `false`)
- [x] `column-width`
- [x] `row-height`
- [x] `header-height`
- [x] `sidebar-width`
- [x] `sidebar-columns` (JSON column defs)
- [x] `sidebar-collapsed`
- [x] `first-day`
- [x] `non-working-days`
- [x] `holidays`
- [x] `working-hours`
- [x] `calendar` (project-wide id)
- [x] `calendars` (registry)
- [x] `time-zone`
- [x] `locale`
- [x] `today` (test override)
- [x] `now-indicator`
- [x] `task-selection` (`""` / `single` / `multiple`)
- [x] `task-multi-select-with-click`
- [x] `suppress-task-click-selection`
- [x] `editable` (master switch)
- [x] `task-start-editable`
- [x] `task-duration-editable`
- [x] `task-progress-editable`
- [x] `task-link-editable`
- [x] `snap-duration`
- [x] `auto-schedule`
- [x] `auto-schedule-strategy` (`forward` / `both` / `strict`)
- [x] `critical-path`
- [x] `baseline` (`hidden` / `overlay` / `compare`)
- [x] `baseline-id`
- [x] `progress-display` (`bar` / `label` / `both` / `none`)
- [x] `dependency-routing` (`orthogonal` / `smooth` / `straight`)
- [x] `dependency-color`
- [x] `summary-rollup`
- [x] `row-virtualization` / `row-virtual-threshold`
- [x] `column-virtualization`
- [x] `wbs-numbering`
- [x] `quick-filter`
- [x] `read-only`
- [x] `persist-key`
- [x] `add-task` (sidebar "+ Add task" affordance)
- [x] `add-dependency-affordance`
- [x] `broadcast` / `broadcast-channel` / `broadcast-filter`
- [ ] `print-mode` (`fit-to-page` / `actual-size`) — wired into the
      stylesheet but not yet swapped at runtime by the controller
- [ ] `accept-files` (drag-to-attach) — option declared, file-drop
      handler deferred

### 1c — Task attributes (`data-task-*`)

- [x] `id`
- [x] `parent-id` (flat-list alternative to nested `<ol>`)
- [x] `name`
- [x] `start`
- [x] `end`
- [x] `duration` (when `end` absent)
- [x] `effort` (person-hours)
- [x] `progress`
- [x] `actual-start` / `actual-end`
- [x] `milestone`
- [x] `summary`
- [x] `collapsed`
- [x] `locked`
- [x] `color`
- [x] `text-color`
- [x] `class-names`
- [x] `constraint-type` (all 8 values from REQUIREMENTS §4)
- [x] `constraint-date`
- [x] `calendar-id`
- [x] `resource-ids` (JSON array)
- [x] `cost`
- [x] `budgeted-cost`
- [x] `priority`
- [x] `renderer` (label override)
- [x] `bar-renderer` (bar override)
- [x] `json` (single payload escape hatch)
- [x] Synthetic-row exclusion from `getTaskData()` /
      persistence (`data-synthetic="true"`)

### 1d — Dependency attributes (`data-dependency-*`)

- [x] `id`
- [x] `from` (predecessor)
- [x] `to` (successor)
- [x] `type` (`FS` / `SS` / `FF` / `SF`)
- [x] `lag` (positive lag / negative lead)
- [x] `color`
- [x] `class-names`
- [x] `hard` (delete-protect)

### 1e — Imperative load paths

- [x] `setTaskData([...])`
- [x] `setDependencyData([...])`
- [x] `setResourceData([...])`
- [x] `setBaselineData([...])`
- [x] `applyTransaction({ add, update, remove })`

### 1f — Boot lifecycle

- [x] `gantt:ready` fires once with `{ api }`
- [x] `element.ganttApi` exposed after ready
- [x] HTML wins over JS: server-rendered task wins over
      `setTaskData(...)` called before `gantt:ready`
- [x] Disconnect tears down listeners + persisted writes flushed

## Phase 2 — Timeline views (`hour`, `day`, `week`, `month`, `quarter`, `year`)

Each view ships a `docs/screenshots/sg-<view>.png` capture and a
demo page that boots straight into that view (or zooms to it).

### 2a — Per-view rendering

- [x] View: `hour` — minute-resolution slot grid → `sg-hour.png`
- [x] View: `day` — single-day with hour columns → `sg-day.png`
- [x] View: `week` — 7-day with day columns → `sg-week.png`
- [x] View: `month` — multi-week with day columns → `sg-month.png`
- [x] View: `quarter` — ~13-week with week columns → `sg-quarter.png`
- [x] View: `year` — 12-month with month columns → `sg-year.png`

### 2b — Header tiers

- [x] Tier resolution table per view (e.g. month → top "month name",
      bottom "day number")
- [x] `data-gantt-header-height-value` doubles when two tiers are
      shown
- [x] Locale-aware tier text via `Intl.DateTimeFormat` (UTC-formatted
      so positioning + label agree — same fix as calendar Phase 17)

### 2c — Shared timeline chrome

- [x] Today highlight (vertical band on the active column)
- [x] Now-indicator vertical red line (hour/day/week views)
- [x] Non-working-day shading (composes with `non-working-days` +
      `holidays`)
- [x] Working-hours shading (hour/day views, gated by
      `working-hours`)
- [x] `auto-fit-range="tasks"` spans the active project; `viewport`
      sticks to `range-start`/`range-end`; `false` honours `date`
- [x] `fitProject()` recomputes column-width to fit everything
- [x] `scrollToTask(id)` and `scrollToDate(date)` align to the
      active column
- [x] `getVisibleRange()` returns `{ start, end }` of the rendered
      slice (used by server-side fetch)
- [x] View switching preserves vertical scroll + selection

### 2d — Per-view overrides (`views`)

- [x] `views: { week: { columnWidth: 64 } }` merges over the
      view's defaults
- [x] `setView(name)` reads the override map on every switch
- [x] Programmatic zoom (`zoomIn` / `zoomOut`) walks the view list in
      order (`hour ↔ day ↔ week ↔ month ↔ quarter ↔ year`)
- [x] `zoomTo(view)` is alias for `setView`

### 2e — Demos & screenshots

- [x] `demo/03-zoom-views.html` — toolbar buttons for every view
- [ ] One screenshot per view captured by `scripts/screenshot.mjs`
      and dropped into `docs/screenshots/` (year view still missing
      a fresh capture)

## Phase 3 — Editing: drag, resize, link, progress

Pointer-events based throughout — works on mouse, pen, touch. The
three drag modes per bar (`move`, `resize-start`, `resize-end`) and
the dependency-linking end-cap are all driven by the same DnD state
machine in `src/lib/dnd.js` and exercised in tests via the
`beginDragTask` / `endDrag` harness without synthetic pointer events.

### 3a — Drag move

- [x] Body of bar = move handle when `editable && task-start-editable`
- [x] Snap to `snap-duration` (defaults to active view's slot)
- [x] `gantt:beforeUpdate` fires with `{ taskId, change }` —
      cancellable with `preventDefault()`
- [x] `gantt:taskMoved` fires on commit with old/new start + end + delta
- [x] Locked tasks (`data-task-locked="true"`) refuse drag
- [x] `read-only` chart refuses every drag
- [x] Cancel-on-Esc reverts the optimistic DOM + fires `beforeUpdate`
      with `cancelled: true`
- [x] Auto-scroll horizontally when cursor nears chart edge
- [x] Auto-scroll vertically when cursor nears sidebar edge
- [x] Drag preview pill anchored to cursor shows new start / end ISO

### 3b — Resize edges

- [x] Trailing-edge handle when `editable && task-duration-editable`
- [x] Leading-edge handle when `eventResizableFromStart` /
      `task-start-editable` allow shrinking from the start
- [x] Resize handle width configurable via
      `data-gantt-resize-handle-width-value` (default `8px`)
- [x] `gantt:taskResized` fires with `{ taskId, edge,
      oldStart/oldEnd, newStart/newEnd }`
- [x] Resize snaps to `snap-duration`
- [x] Resize honours `min-duration` / `max-duration` per task (when
      declared in `extendedProps`)

### 3c — Link end-cap (drag-to-create-dependency)

- [x] End-cap appears on hover when `task-link-editable`
- [x] Drag end-cap to body of another task → creates `FS` dep
- [x] Drag end-cap to leading edge → creates `SS` dep
- [x] `gantt:beforeDependencyAdd` cancellable
- [x] `gantt:dependencyAdded` on commit
- [x] `data-task-locked` tasks refuse to be the new dep's source
- [x] Visual indicator: drag-line follows the cursor until release

### 3d — Progress

- [x] Inset stripe is the progress drag handle when
      `editable && task-progress-editable`
- [x] Snap to nearest 5 % (configurable via
      `data-gantt-progress-snap-value`)
- [x] `gantt:taskProgressChanged` fires on commit

### 3e — Multi-select bulk reschedule

- [x] `task-selection="multiple"` enables Cmd/Ctrl+click adds
- [x] Dragging any selected bar moves the whole set as a rigid group
- [x] Relative offsets preserved across the group
- [x] Linked dependencies travel with the group (arrows redraw mid-drag)
- [x] `←/→` with multiple tasks selected shifts every selection by
      `snap-duration`

### 3f — Auto-scheduling on commit

- [x] `auto-schedule="true"` reflows successors through dependency
      types + lag after every move / resize
- [x] `auto-schedule-strategy="forward"` only pushes downstream
- [x] `auto-schedule-strategy="both"` also pulls slack-laden
      predecessors when shrinking a task
- [x] `auto-schedule-strategy="strict"` refuses changes that would
      break a constraint, firing `gantt:scheduleConflict`
- [x] Tests cover FS / SS / FF / SF reflow with positive + negative lag

### 3g — Programmatic harness

- [x] `beginDragTask(id, { mode })` (`move` / `resize-start` /
      `resize-end` / `link`)
- [x] `endDrag({ commit, newStart, newEnd, toTaskId })`
- [x] Same code path as a real pointer drag — tests assert on the
      mutation pipeline, not synthetic pointer events

## Phase 4 — Dependencies & arrow router

Arrows live in an SVG overlay (`src/lib/arrows.js`) on top of the
timeline. Anchor selection comes from the dep's `type`; routing comes
from the chart's `dependency-routing` option.

### 4a — Dependency types (anchor selection)

- [x] `FS` (finish → start)
- [x] `SS` (start → start)
- [x] `FF` (finish → finish)
- [x] `SF` (start → finish)
- [x] Lag/lead applied to the target anchor before routing
- [x] Anchors on summary bars resolve to the rolled-up span

### 4b — Routing modes

- [x] `orthogonal` — right-angled connectors with corner-radius CSS
      custom property
- [x] `smooth` — bezier curve
- [x] `straight` — direct line
- [x] Self-loops avoided (predecessor === successor refused at parse)
- [x] Off-screen partner: arrow routes to chart edge with an
      "off-screen" arrow-head affordance (virtualisation-aware)

### 4c — Drag-to-create

- [x] End-cap affordance per §3c
- [x] `gantt:beforeDependencyAdd` cancellable
- [x] Duplicate detection: same `from`/`to`/`type` rejected with
      no event
- [x] Cycle detection: new dep that creates a cycle in the DAG fires
      `gantt:scheduleConflict` and is rejected
- [x] `addDependency(dep)` API equivalent

### 4d — Delete

- [x] Click an arrow → selected (`gantt-dep-selected` class)
- [x] `gantt:dependencySelectionChanged` fires
- [x] Delete / Backspace → fires `gantt:beforeDependencyRemove`
      cancellable, then `gantt:dependencyRemoved`
- [x] `data-dependency-hard="true"` refuses the delete
- [x] `removeDependencyById(id)` API equivalent

### 4e — Styling

- [x] `data-gantt-dependency-color-value` default colour
- [x] Per-arrow `data-dependency-color` override
- [x] `data-dependency-class-names` extra classes
- [x] Hover state highlights endpoints (`data-task-dep-highlight`)
- [x] Critical-path arrows pick up the critical-rail colour

## Phase 5 — Scheduler (CPM)

`src/lib/schedule.js`. Deterministic, single-pass, idempotent — the
same project produces the same critical path on every host.

### 5a — Forward pass

- [x] Topological sort of the task DAG
- [x] Early-start / early-finish per task respecting dep type + lag
- [x] Calendar-aware date arithmetic (skips non-working time)
- [x] Constraint enforcement (`mustStartOn`, `mustFinishOn`,
      `startNoEarlierThan`, `startNoLaterThan`,
      `finishNoEarlierThan`, `finishNoLaterThan`,
      `asSoonAsPossible`, `asLateAsPossible`)
- [x] Constraint conflict → `gantt:scheduleConflict`

### 5b — Backward pass

- [x] Late-finish / late-start per task from project end
- [x] Total slack = `late_start − early_start`
- [x] Free slack = min successor's early_start − this task's
      early_finish − lag
- [x] Negative slack signals over-constrained network

### 5c — Critical path

- [x] `critical-path` toggle calls `scheduleProject()` on every
      mutation
- [x] Tasks with `total_slack <= criticalSlackTolerance` (default
      `0`) flagged
- [x] `data-critical="true"` on the bar; red rail in CSS
- [x] `gantt:criticalPathRecomputed` fires with id list

### 5d — Public surface

- [x] `scheduleProject()`
- [x] `setCriticalPath(bool)`
- [x] `getCriticalPathIds()`
- [x] `getTaskSlack(id)` → `{ total, free, late_start, late_finish }`
- [x] `setTaskConstraint(id, { type, date })`
- [x] `reschedule(id, { start, end, duration })`
- [x] `reflowSuccessors(id)` (internal — exposed for tests)
- [x] Test fixture from a published reference plan (Bryntum sample)

## Phase 6 — Baselines

`src/lib/model.js` stores `baselines: Map<id, { id, name,
capturedAt, tasks: [{ id, start, end, progress }] }>` separately from
the live tasks.

- [x] `captureBaseline({ id, name })` — snapshot current plan
- [x] `setActiveBaseline(id)` — switch which baseline is rendered
- [x] `clearBaseline(id)` — remove a baseline
- [x] `getBaselineData()` / `setBaselineData(bs)` round-trip
- [x] Multiple baselines coexist
- [x] `baseline="hidden"` (default — no rendering, data still kept)
- [x] `baseline="overlay"` — translucent grey bar above each current
      bar
- [x] `baseline="compare"` — rows split horizontally (baseline above,
      current below)
- [x] `baseline-id` chooses which captured snapshot is active
- [x] `gantt:baselineCaptured` fires
- [x] Demo `demo/08-baseline-overlay.html`
- [x] Demo `demo/09-baseline-compare.html`
- [ ] Screenshot `docs/screenshots/sg-baseline-overlay.png`
- [ ] Screenshot `docs/screenshots/sg-baseline-compare.png`

## Phase 5 — Scheduling (done)

- [x] Topological CPM forward + backward pass
- [x] `setCriticalPath` toggle
- [x] `reflowSuccessors` push policy
- [x] `getTaskSlack` (total + free)

## Phase 6 — Baselines (done)

- [x] `captureBaseline({ id, name })`
- [x] Overlay layout
- [x] Compare layout
- [x] Multiple baselines coexist; pick via `baseline-id`

## Phase 7 — Calendars & working time

`src/lib/calendar.js` owns the working-time arithmetic. Resolution
order is **task → resource → project → default**.

### 7a — Registry

- [x] `data-gantt-calendars-value` JSON map
- [x] `data-gantt-calendar-value` chart-wide default id
- [x] Built-in `default` calendar (Mon–Fri 09:00–17:00)
- [x] Per-resource `calendar` field
- [x] Per-task `data-task-calendar-id`

### 7b — Calendar shape

- [x] `weekdays: number[]` (0 = Sun)
- [x] `hours: [["09:00","17:00"], …]` (multiple shift windows)
- [x] `holidays: ISOString[]`
- [x] Multi-shift days (e.g. `09:00–12:30, 13:30–17:00`)

### 7c — Arithmetic helpers (exported)

- [x] `addBusinessDuration(date, dur, cal)`
- [x] `durationBetween(a, b, cal)`
- [x] `isWorkingTime(date, cal)`
- [x] `nextWorkingMinute(date, cal)`
- [x] DST-safe (test fixtures cross spring-forward + fall-back)

### 7d — Rendering side

- [x] Non-working columns shaded across every view
- [x] Working-hours band shaded in hour / day views
- [x] Holidays shaded with dotted overlay (distinct from weekend)
- [x] Drag snaps over non-working spans by default (a 2-day task
      dragged onto Friday lands on Tuesday)

### 7e — Tests & demos

- [x] `test/calendar.test.js` — weekday-only, multi-shift, DST,
      holiday-skipping
- [x] Demo `demo/17-calendar-non-working-time.html`
- [x] Demo `demo/18-multi-calendar-resources.html`
- [x] Demo `demo/44-tradie-trade-calendars.html` (industry scenario)

## Phase 8 — Sidebar (WBS)

`src/controllers/gantt_sidebar_controller.js`. A mini-grid that
scrolls vertically in sync with the timeline. Columns are declared
via `data-gantt-sidebar-columns-value` (JSON array) or via the API.

### 8a — Built-in columns (each is one box)

- [x] `wbs` — `1`, `1.1`, `1.2`, … numbering
- [x] `name` — task name + indent + expand chevron
- [x] `start`
- [x] `end`
- [x] `duration`
- [x] `effort`
- [x] `progress`
- [x] `resources` — chip list
- [x] `predecessors` — `"3FS+2d, 5SS"` notation
- [x] `actual-start`
- [x] `actual-end`
- [x] `baseline-start`
- [x] `baseline-end`
- [x] `slack`
- [x] `critical` — boolean indicator dot
- [x] `cost`
- [x] `priority`
- [x] `status` — derived from progress + dates (`Not started` /
      `In progress` / `Late` / `Done`)
- [x] `indicators` — icons for attachments, notes, recurrence,
      conflict, late

### 8b — Per-column behaviour

- [x] `width` resize via drag on column-edge → persisted
- [x] `align: left|center|right`
- [x] `hidden: true` — column kept registered but not rendered
- [x] `frozen: true` — column pinned to the left of horizontal scroll
- [x] Reorder by dragging the header
- [x] Sort: `asc|desc|undefined` per column
- [x] `setColumnVisible(field, bool)`
- [x] `moveColumn(field, toIndex)`
- [x] `setSidebarColumns(cols)`
- [x] `getSidebarColumns()`
- [x] `setSortField(field, dir)`

### 8c — Inline editors (per editor type)

- [x] `text` — single-line input, Enter / Tab commits, Esc cancels
- [x] `number` — `<input type=number>` with min/max
- [x] `duration` — accepts `"5d"`, `"08:00"`, raw seconds
- [x] `date` — `<input type=date>` (date-only) and date-time fallback
- [x] `progress` — `<input type=range>` 0–1
- [x] `resources` — chip-picker against `setResourceData([...])`
- [x] `predecessors` — chip-picker over task ids with FS/SS/FF/SF +
      lag inline

### 8d — Sidebar chrome

- [x] `sidebar-width` initial pixel width
- [x] `sidebar-collapsed` toggles icon-only mode
- [x] `setSidebarWidth(px)` / `setSidebarCollapsed(bool)` API
- [x] Vertical scroll sync with timeline (single `scrollTop`)
- [x] `add-task="true"` shows "+ Add task" inline affordance at the
      bottom
- [x] Group rows: `setGroupBy(field)` injects synthetic group rows
      above WBS hierarchy
- [x] Group collapse persisted alongside task-collapse

### 8e — Tree mutations

- [x] `expandTask(id)` / `collapseTask(id)`
- [x] `expandAll()` / `collapseAll()`
- [x] `expandToLevel(n)`
- [x] `indentTask(id)` / `outdentTask(id)`
- [x] `moveTask(id, { parentId, toIndex })`
- [x] `gantt:taskReparented` event

## Phase 8 — Sidebar (WBS) (done)

- [x] 18 built-in columns
- [x] Per-column width / align / hidden
- [x] WBS numbering injection
- [x] Group-by + sort hooks via API

## Phase 9 — Renderers

Four independent registries (`label`, `bar`, `milestone`,
`dependency`) live in `src/lib/renderers.js`. Each is opted into via
`data-task-renderer`, `data-task-bar-renderer`, etc. Hosts can
register more via the `registerXRenderer(name, fn)` exports.

### 9a — Label renderers (sidebar row)

- [x] `default` — WBS chevron + name + summary/milestone class hooks
- [x] `template` — clone `<template id="…">` with `data-bind*`

### 9b — Bar renderers (timeline bar)

- [x] `default` — block bar + inset progress stripe
- [x] `progress-stripe` — bar with `--progress` CSS custom property
- [x] `resource-stripes` — per-resource colour band
- [x] `summary` — rolled-up span with corner pips
- [x] `phase` — wide, low-saturation phase bar
- [x] `milestone-diamond` — diamond marker (bar registry, mirrors
      milestone registry for symmetry)
- [x] `flag` — pennant marker
- [x] `chevron` — leading-arrow shape
- [x] `actual-vs-planned` — split bar (top: planned, bottom: actual)
- [x] `template` — clone `<template id="…">` with `data-bind*`

### 9c — Milestone renderers

- [x] `default` — SVG diamond, picks up `data-task-color`
- [x] `template` — clone `<template id="…">`

### 9d — Dependency renderers

- [x] `default` — solid stroke arrow
- [x] `dashed` — dashed stroke (used for soft deps in demos)
- [ ] `labelled` — arrow with mid-segment lag label (declared in
      REQUIREMENTS §10; not yet shipped)
- [ ] `thick-arrow` — wider stroke for critical-path overlay
      (declared, not yet shipped)

### 9e — Registration API

- [x] `registerLabelRenderer(name, fn)` / `getLabelRenderer(name)`
- [x] `registerBarRenderer(name, fn)` / `getBarRenderer(name)`
- [x] `registerMilestoneRenderer(name, fn)` / `getMilestoneRenderer(name)`
- [x] `registerDependencyRenderer(name, fn)` / `getDependencyRenderer(name)`
- [x] Per-task `data-task-renderer` overrides chart default
- [x] Per-task `data-task-bar-renderer` overrides chart default
- [x] `data-gantt-task-renderer-value` chart-wide default
- [x] `data-gantt-bar-renderer-value` chart-wide default
- [x] `data-gantt-milestone-renderer-value` chart-wide default
- [x] `data-gantt-dependency-renderer-value` chart-wide default

### 9f — Template bindings (`<template>` path)

- [x] `data-bind="field"` → text content
- [x] `data-bind-text="field"` → formatted text
- [x] `data-bind-attr="attr:field"` → set attribute
- [x] Multi-attr: `data-bind-attr="style:--progress:progress"` writes
      a CSS custom property
- [x] Demo `demo/28-custom-bar-renderer.html` showcases custom
      template-driven bar

## Phase 10 — Resource histogram

`src/controllers/gantt_histogram_controller.js`. Optional panel below
the chart; one row per resource.

- [x] Toggle via `data-gantt-resource-histogram-value="true"`
- [x] Allocation bars summed per slot of the active view
- [x] Capacity reference line at the resource's `capacity`
      (default `1.0`)
- [x] Overallocation segments shade red
- [x] `gantt:overallocationDetected` fires once per contiguous
      interval (debounced, not per-slot)
- [x] Subscribes to the same data store as the chart — chart mutation
      reflows histogram on next animation frame
- [x] Per-resource colour from `data-resource-color`
- [x] Click a bar → fires `gantt:histogramBarClicked`
- [x] Demo `demo/15-resource-histogram.html`
- [x] Demo `demo/16-overallocation.html`
- [ ] Screenshot `docs/screenshots/sg-overallocation.png`

## Phase 11 — Virtualisation

`src/lib/virtual.js`. Two axes virtualised independently so 10 000+
tasks render at 60 fps.

### 11a — Row virtualisation

- [x] Threshold via `data-gantt-row-virtual-threshold-value`
      (default `200`)
- [x] Recycled DOM nodes on scroll
- [x] Variable row heights fall back to measure-then-mount per row
- [x] Force-on via `data-gantt-row-virtualization-value="true"`

### 11b — Column virtualisation

- [x] Off-viewport timeline columns rendered as spacers
- [x] Bars wholly outside viewport not mounted
- [x] Bars partially visible mounted
- [x] Dependency arrows route via visible anchor + off-screen
      affordance
- [x] `data-gantt-column-virtualization-value="false"` opt-out

### 11c — Interaction in a virtualised viewport

- [x] Drag a bar off-screen auto-scrolls + resolves drop date against
      logical timeline
- [x] `scrollToTask(id)` mounts the row before scrolling
- [x] Dependency arrows redraw within one frame of scroll

### 11d — Demo & tests

- [x] Demo `demo/19-virtual-10k-tasks.html`
- [x] `test/virtual.test.js` — row + column recycling, edge cases

## Phase 12 — Filter, sort, group

- [x] `setQuickFilter(q)` — substring against name + all string
      fields; case-insensitive
- [x] `data-gantt-quick-filter-value` initial value
- [x] `data-gantt-filter-mode-value` `"dim"` vs `"hide"` (default
      `"hide"`)
- [x] Hidden mode preserves summary parents whose descendants match
- [x] `setTaskFilter(predicate)` / `getTaskFilter()` for app rules
- [x] Sort: per-column `sort: 'asc'|'desc'` via
      `setSidebarColumns`
- [x] `setSortField(field, dir)` programmatic
- [x] Sort respects parent/child tree by default
- [x] `setSortField(field, dir, { flatten: true })` ignores tree
- [x] `setGroupBy(field)` / `getGroupBy()` — synthetic group rows
- [x] Group rows are collapsible + collapse state persisted
- [x] `gantt:filterChanged` event
- [x] `gantt:groupChanged` event
- [x] Demo `demo/14-grouping-by-resource.html`
- [x] Demo `demo/21-quick-filter.html`

## Phase 10 — Resource histogram (done)

- [x] `gantt-histogram` controller
- [x] Bars + capacity reference
- [x] `gantt:overallocationDetected` (debounced per interval)

## Phase 11 — Virtualisation (done)

- [x] Row virtualisation past threshold
- [x] Column virtualisation past viewport
- [x] 10 000-task demo

## Phase 12 — Filter, sort, group (done)

- [x] Quick filter (substring)
- [x] Predicate filter
- [x] Sort field + direction
- [x] Group-by injection

## Phase 13 — Persistence (`persist-key`)

`src/lib/persist.js`. JSON state round-trips through
`localStorage["sgantt:" + key]`.

### 13a — Persisted fields (per `REQUIREMENTS.md §16`)

- [x] View name
- [x] Column width (timeline)
- [x] Sidebar width
- [x] Sidebar collapsed state
- [x] Sidebar column order
- [x] Sidebar column widths
- [x] Sidebar column visibility
- [x] Sort: `{ field, direction }`
- [x] Group-by field
- [x] Per-task expand / collapse map
- [x] Quick-filter string
- [x] Active baseline id
- [x] Baseline display mode (`hidden` / `overlay` / `compare`)
- [x] Critical-path on/off
- [x] Slack-display on/off
- [x] Read-only toggle
- [ ] Scroll position (declared session-scoped, off by default —
      opt-in flag not yet implemented)

### 13b — Round-trip mechanics

- [x] Writes debounced 200 ms
- [x] Flushed on `beforeunload`
- [x] Restore broadcasts a single `gantt:ganttStateApplied` event
      after layout
- [x] `getGanttState()` / `applyGanttState(state)` exposed on the API
- [x] `clearPersistedState()` API
- [x] No task data persisted (server / host is the source of truth)

## Phase 14 — Live broadcasting

`src/lib/broadcast/`. Transport-agnostic core + four adapters. The
mutation envelope shape is `{ op, payload, origin, ts }`.

### 14a — Core bus

- [x] `lib/broadcast/bus.js` — `BroadcastBus` (subscribe / publish,
      JSON envelope with `op`, `payload`, `meta`, `origin`)
- [x] `lib/broadcast/index.js` — adapter resolution from
      `data-gantt-broadcast-value`
- [x] Echo suppression by `origin` id (originator ignores its own
      messages)
- [x] Last-write-wins by task id; overridable via
      `ganttBroadcastResolve` callback

### 14b — Outbound wiring

- [x] `addTask` / `updateTask` / `removeTaskById` publish on the bus
- [x] `addDependency` / `removeDependencyById` publish on the bus
- [x] Pointer drag commits publish on the bus
- [x] Per-mutation `gantt:broadcast:out` event (cancellable —
      `preventDefault` prevents publish)

### 14c — Inbound wiring

- [x] Bus → store mutation via `applyTransaction`
- [x] `gantt:broadcast:in` event fired for each inbound message
- [x] Origin tag prevents echo loops
- [x] Unknown `op` logged (not thrown) — forward compatibility

### 14d — Adapter: BroadcastChannel

- [x] `lib/broadcast/broadcast_channel.js`
- [x] Channel name from `data-gantt-broadcast-channel-value`
- [x] Tab-to-tab sync inside one browser, no server
- [x] Demo `demo/25-broadcast-two-tabs.html`

### 14e — Adapter: WebSocket

- [x] `lib/broadcast/websocket.js`
- [x] URL from `data-gantt-broadcast-channel-value`
- [x] Auto-reconnect with backoff
- [x] `wss://` honoured

### 14f — Adapter: Action Cable

- [x] `lib/broadcast/action_cable.js`
- [x] Channel + identifier from option
- [x] Subscribes on connect, unsubscribes on disconnect
- [x] Reuses `window.App.cable` if available, otherwise creates

### 14g — Adapter: Turbo Stream

- [x] `lib/broadcast/turbo_stream.js`
- [x] `<turbo-stream action="gantt-task-add|update|remove">` handler
- [x] `gantt-dependency-add|remove` handlers
- [x] `gantt-bulk` handler (atomic batch)
- [x] `gantt-conflict` handler (server vs client value conflict)
- [x] Outbound: publishes as Turbo Stream over the host's existing
      cable connection

### 14h — Options & filter

- [x] `data-gantt-broadcast-value` (`false` / `turbo-stream` /
      `action-cable` / `websocket` / `broadcast-channel`)
- [x] `data-gantt-broadcast-channel-value`
- [x] `data-gantt-broadcast-filter-value` predicate decides which
      local mutations to publish
- [x] `setBroadcastFilter(fn)` API equivalent

### 14i — Tests & docs

- [x] `test/broadcast.test.js` — bus + each adapter
- [ ] End-to-end two-instance test (mirroring calendar's
      `broadcast_e2e.test.js`) on happy-dom with real
      `BroadcastChannel` — the catch-net for silent-drop regressions
- [x] `docs/BROADCAST.md` — payload schema + Rails recipe

## Phase 15 — Import / export

`src/lib/export.js`.

### 15a — JSON

- [x] `getDataAsJson()` — single document with `tasks`,
      `dependencies`, `resources`, `baselines`, `calendars`
- [x] `setTaskData(...)` consumes the same shape
- [x] Round-trip stable (test fixture)

### 15b — CSV

- [x] `getDataAsCsv({ columns })`
- [x] Predecessor encoding `"3FS+2d, 5SS"` (PM convention)
- [x] Column subset honoured
- [x] Date / duration / number formatting locale-aware

### 15c — MS Project XML

- [x] `getDataAsMsProjectXml()` (export)
- [x] `setTaskDataFromMsProjectXml(xml)` (import)
- [x] Lossless for tasks, dependencies, calendars, resources,
      baselines (the MS Project subset)
- [x] `docs/MSPROJECT.md` documents round-trip caveats
- [x] Demo `demo/24-ms-project-xml-import.html`

### 15d — PDF (print)

- [x] `printToPdf({ scale, paperSize, fitWidth })` — client-side
      `window.print()` with `@media print` stylesheet
- [x] `print-mode="fit-to-page"` swaps the stylesheet
- [x] Demo `demo/23-print-pdf.html`
- [ ] Server-side renderer (Grover-based) — declared in REQUIREMENTS;
      lands with the Rails gem follow-up

### 15e — PNG / SVG snapshot

- [x] `exportImage({ format, range })` — `"png"` / `"svg"`,
      `"visible"` / `"project"`
- [x] Used by `scripts/screenshot.mjs` for the docs captures

## Phase 16 — Detail panel & inline editor

- [x] `gantt-detail-panel` controller — clones
      `<template id="task-detail-tpl">`
- [x] `data-gantt-detail-layout-value` `"popover"` (default) /
      `"rail"`
- [x] Rail width via `data-gantt-detail-width-value`
- [x] Click-out / Esc closes
- [x] `openTaskDetail(id)` / `closeTaskDetail()` / `isTaskDetailOpen()`
      API
- [x] `gantt:taskDetailOpened` / `gantt:taskDetailClosed` events
- [x] Commits via `applyTransaction` → standard mutation pipeline
- [x] Bindings: `data-bind`, `data-bind-attr`, `data-detail-if`

- [x] `gantt-task-editor` controller — clones
      `<template id="task-editor">`
- [x] `[data-editor-field="<f>"]` seeded from task, read back on
      commit
- [x] Enter / Tab commits; Esc cancels
- [x] `[data-editor-commit]` / `[data-editor-cancel]` buttons fire
      the same handlers

- [x] Demo `demo/26-task-detail-popover.html`
- [x] Demo `demo/27-task-detail-rail.html`
- [x] Demo `demo/13-inline-edit-sidebar.html`

## Phase 14 — Broadcasting (done)

- [x] Bus + adapter resolution
- [x] BroadcastChannel adapter (tab-to-tab)
- [x] Action Cable adapter
- [x] Turbo Stream adapter (handlers + outbound event)
- [x] Raw WebSocket adapter

## Phase 15 — Import / export (done)

- [x] JSON round-trip
- [x] CSV with predecessor encoding
- [x] MS Project XML export + reimport
- [x] Print via `window.print()`

## Phase 16 — Detail panel & editor (done)

- [x] `gantt-detail-panel` controller (cloned template)
- [x] `gantt-task-editor` controller (inline editor)
- [x] `openTaskDetail` / `closeTaskDetail` API

## Phase 17 — Rails companion gem (`stimulus_gantt_rails`)

Mirrors `gem/stimulus_calendar_rails`'s shape: engine, declarative
DSL, `Broadcastable` concern, custom Turbo Stream actions,
controllers, view partial, importmap pins, asset pipeline, dummy
Rails app integration tests. The gem ships under
`gem/stimulus_gantt_rails/`; the runnable test bed will live under
`gem/demo/`.

### 17a — Engine internals

- [x] `lib/stimulus_gantt_rails.rb` — module root,
      `parent_controller=`, `mount_path=`, per-process registry
      (`register_gantt` / `lookup_gantt`)
- [x] `lib/stimulus_gantt_rails/version.rb`
- [x] `lib/stimulus_gantt_rails/engine.rb` — asset precompile,
      importmap paths, view path appended
- [x] `config/routes.rb` — `/:resource/events`,
      `/:resource/dependencies`, `/:resource/resources`,
      `/:resource/bulk`
- [x] `config/importmap.rb` — pin `stimulus_gantt`,
      `stimulus_gantt_rails`
- [x] `app/assets/javascripts/stimulus_gantt.js` — vendor the IIFE
      bundle via `bin/sync-rails-assets`
- [x] `app/assets/javascripts/stimulus_gantt_rails.js` — Stimulus
      glue + `registerStreamActions` for the custom Gantt Turbo
      Stream actions
- [x] `app/assets/stylesheets/stimulus_gantt.css`
- [ ] `tenant_stream_token` + `streamables_for` helpers
      (declared in REQUIREMENTS §19; ActsAsTenant wiring deferred to
      the demo Rails app)

### 17b — Server-side declarative DSL

- [x] `lib/stimulus_gantt_rails/gantt.rb` — base class:
      `resource`, `model`, `field`, `dependency_types`, `calendar`,
      `before_update`, `inherited` (subclass dup)
- [x] `lib/stimulus_gantt_rails/field.rb` — per-field declaration
      (`type`, `editable`, `validate`, `concurrency`, `values`)
- [x] `lib/stimulus_gantt_rails/calendar.rb` — `weekdays`, `hours`,
      `holidays`, `as_json`
- [x] `Field#editable_for?(row, user)` (boolean or lambda)
- [x] Type coercion (`:string`, `:datetime`, `:duration`, `:float`,
      `:array`, `:enum`, `:reference`)
- [x] `validate` lambda invoked server-side; errors round-trip
      through the conflict op
- [ ] `concurrency: :version_checked` — declared, deferred until
      `lock_version` integration lands in the demo app

### 17c — Custom Turbo Stream actions

- [x] `lib/stimulus_gantt_rails/turbo_streams_helper.rb` (registers
      the actions on engine boot)
- [x] `<turbo-stream action="gantt-task-add">` — insert one task by id
- [x] `<turbo-stream action="gantt-task-update">` — patch one task's
      fields by id
- [x] `<turbo-stream action="gantt-task-remove">` — delete one task
      by id
- [x] `<turbo-stream action="gantt-dependency-add">`
- [x] `<turbo-stream action="gantt-dependency-remove">`
- [x] `<turbo-stream action="gantt-resource-add|update|remove">`
- [x] `<turbo-stream action="gantt-source-refetch">` (client refetch)
- [x] `<turbo-stream action="gantt-bulk">` (atomic batched stream)
- [x] `<turbo-stream action="gantt-conflict">` (server vs client
      value conflict, e.g. version-checked move)

### 17d — Broadcastable model concern

- [x] `lib/stimulus_gantt_rails/concerns/broadcastable.rb` —
      `broadcasts_gantt GanttClass`; `after_create_commit`,
      `after_update_commit`, `after_destroy_commit` callbacks
      generate `gantt-task-add|update|remove` messages
- [x] `stream:` lambda for tenant-scoped channel names
- [ ] Test (`gem/demo/test/models/task_broadcast_test.rb`) — deferred
      with `gem/demo`

### 17e — Controllers

- [x] `BaseController` / `ApplicationController` (inherits from
      `StimulusGanttRails.parent_controller`)
- [x] `EventsController#index` — JSON list scoped by `?start=&end=`
- [x] `EventsController#create` — accepts `optimistic_id`, persist,
      relies on Broadcastable to broadcast
- [x] `EventsController#update` — drag/resize destination; same
      optimistic-id pattern as `stimulus_calendar_rails`
- [x] `EventsController#destroy`
- [x] `EventsController#destroy_bulk`
- [x] `EventsController#bulk` (transactional multi-change)
- [x] `DependenciesController#create` / `#destroy`
- [x] `ResourcesController#index` — JSON list (chip-picker source)
- [ ] Integration tests under `gem/demo/test/integration/` —
      deferred with `gem/demo`

### 17f — View partial

- [x] `app/views/stimulus_gantt_rails/gantts/_gantt.html.erb` —
      renders the `.sg-gantt` container with all
      `data-controller="gantt"` value attributes derived from the
      Gantt class + locals
- [ ] `<%= turbo_stream_from(*StimulusGanttRails.streamables_for(resource)) %>`
      helper — pending `streamables_for` (§17a)
- [ ] Helper module for `data-*` value attribute serialisation —
      pending

### 17g — Dummy Rails app (`gem/demo/`)

- [ ] `app/models/task.rb` — `include Broadcastable`,
      `broadcasts_gantt ProjectGantt`, validations
- [ ] `app/models/dependency.rb`
- [ ] `app/models/resource.rb`
- [ ] `app/gantts/project_gantt.rb`
- [ ] `app/controllers/gantts_controller.rb#index`
- [ ] `db/migrate/…create_tasks.rb`, `…create_dependencies.rb`,
      `…create_resources.rb`
- [ ] Fixtures or factory helper
- [ ] System test: drag a task → other tab updates
      (capybara-action-cable style)

### 17h — Concurrency & conflicts

- [ ] Per-field `concurrency: :version_checked` honouring
      `lock_version`
- [ ] `gantt-conflict` broadcast on stale write
- [ ] `gem/demo` integration test: stale move → conflict, fresh
      move → succeed

### 17i — Multi-tenant + auth

- [ ] `parent_controller` config respected by all gem controllers
- [ ] ActsAsTenant scoping in `streamables_for`
- [ ] `gem/demo` test: tenant A's broadcast never reaches tenant B

### 17j — Release prep for the gem

- [x] `gem/stimulus_gantt_rails/README.md` — gem-specific quick start
- [x] `gem/stimulus_gantt_rails/CHANGELOG.md`
- [ ] `bin/rails stimulus_gantt_rails:install:migrations` task
      (deferred until the audit-log migration lands)
- [ ] `gem build stimulus_gantt_rails.gemspec` smoke step in CI

## Phase 18 — Demos & docs

### 18a — Core demos (per feature)

- [x] `demo/01-basic.html` — minimum boot
- [x] `demo/02-json-data.html` — `data-gantt-task-source-value`
- [x] `demo/03-zoom-views.html` — all six views
- [x] `demo/04-drag-move-resize.html`
- [x] `demo/05-dependency-arrows.html` — pre-loaded deps
- [x] `demo/06-create-link-by-drag.html` — end-cap affordance
- [x] `demo/07-critical-path.html`
- [x] `demo/08-baseline-overlay.html`
- [x] `demo/09-baseline-compare.html`
- [x] `demo/10-milestones.html`
- [x] `demo/11-summary-rollup.html`
- [x] `demo/12-wbs-sidebar-columns.html`
- [x] `demo/13-inline-edit-sidebar.html`
- [x] `demo/14-grouping-by-resource.html`
- [x] `demo/15-resource-histogram.html`
- [x] `demo/16-overallocation.html`
- [x] `demo/17-calendar-non-working-time.html`
- [x] `demo/18-multi-calendar-resources.html`
- [x] `demo/19-virtual-10k-tasks.html`
- [x] `demo/20-multi-select-bulk-reschedule.html`
- [x] `demo/21-quick-filter.html`
- [x] `demo/22-persisted-state.html`
- [x] `demo/23-print-pdf.html`
- [x] `demo/24-ms-project-xml-import.html`
- [x] `demo/25-broadcast-two-tabs.html`
- [x] `demo/26-task-detail-popover.html`
- [x] `demo/27-task-detail-rail.html`
- [x] `demo/28-custom-bar-renderer.html`
- [x] `demo/29-keyboard-nav.html`
- [x] `demo/30-toolbar.html`

### 18b — Industry-scenario demos

- [x] `demo/40-tradie-bathroom-reno.html`
- [x] `demo/41-tradie-house-build.html`
- [x] `demo/42-tradie-jobs-by-tech.html`
- [x] `demo/43-tradie-multi-site.html`
- [x] `demo/44-tradie-trade-calendars.html`
- [x] `demo/45-tradie-compliance-rollout.html`

### 18c — Docs

- [x] `demo/index.html` — landing page linking every demo
- [x] `README.md` — install / contract / attributes / API / events /
      renderers / calendars / Rails section
- [x] `DESIGN.md` — module map + render pipeline
- [x] `RAILS.md` — checklist for hosts wiring up the gem
- [x] `docs/REFERENCE.md` — full programmatic JS API reference
- [x] `docs/BROADCAST.md` — payload schema + Rails recipe
- [x] `docs/MSPROJECT.md` — MS Project XML import / export mapping
- [x] `docs/RAILS_REFERENCE.md` — full server-side `Gantt` / `Field`
      / DSL reference

### 18d — Screenshots & GIFs

- [x] `docs/screenshots/` directory present, README links absolute
      GitHub raw URLs (commit `4e24f0a`)
- [x] `scripts/screenshot.mjs` — Playwright-driven capture script
- [ ] One screenshot per view (year still missing — see §2e)
- [ ] `docs/screenshots/sg-broadcast.gif` — live-sync animation
      (mirrors calendar's `cal-broadcast.gif`)
- [ ] `docs/screenshots/sg-overallocation.png` (see §10)
- [ ] `docs/screenshots/sg-baseline-overlay.png` /
      `…-baseline-compare.png` (see §6)

## Phase 19 — CI & release

### 19a — CI

- [x] `.github/workflows/ci.yml` — Node 20, `npm ci`, `npm test`,
      `npm run build:lib` on every push / PR
- [ ] Ruby job — `cd gem/demo && bin/rails test` (lands with §17g)
- [ ] `gem build stimulus_gantt_rails.gemspec` smoke step
- [ ] Lint step (ESLint + Rubocop in `gem/demo`)

### 19b — npm release

- [x] `prepublishOnly` wired in `package.json` (build + test)
- [x] `files` whitelist verified (`dist`, `src`, `README.md`,
      `LICENSE`)
- [x] `exports` map covers `.` (ESM), `./style.css`, `./dist/*`,
      `./package.json`
- [ ] CDN bundle smoke test (`dist/stimulus_gantt.js` in a plain
      HTML page)
- [ ] Tag `0.1.0` + release notes
- [ ] Verify fresh-sandbox install paths
      (`npm i @ninjaai/stimulus_gantt` and
      `bundle add stimulus_gantt_rails`)

### 19c — Rails gem release

- [ ] `gem build` step in CI
- [ ] Push to RubyGems
- [ ] Verify in a fresh `rails new` sandbox

## Phase 20 — Skills (LLM usage guides)

### 20a — `skills/stimulus-gantt-js/SKILL.md`

- [x] Frontmatter (`name`, `description`)
- [x] Setup section (IIFE / npm / Rails install paths)
- [x] Minimal Gantt section
- [x] Attribute reference (mirrors README §3-§6)
- [x] Events reference
- [x] Public API reference
- [x] Renderers section
- [x] Calendars / critical-path / baselines section
- [x] Broadcasting section
- [x] Gotchas section

### 20b — `skills/stimulus-gantt-rails/SKILL.md`

- [x] Frontmatter
- [x] Setup section (bundle add, importmap pin, css link, route mount)
- [x] Declaring a `Gantt` class
- [x] Broadcastable concern
- [x] Render partial
- [x] Custom Turbo Stream actions
- [x] Optimistic-id pattern
- [x] Concurrency / conflicts gotchas

## Phase 21 — Public API coverage matrix (`element.ganttApi`)

Every method documented in `REQUIREMENTS.md §8`, tracked as its own
box. Each box implies: implementation + unit test in
`test/api.test.js` + a README / `docs/REFERENCE.md` paragraph.

### 21a — Data

- [x] `setTaskData(tasks)`
- [x] `getTaskData()`
- [x] `setDependencyData(deps)`
- [x] `getDependencyData()`
- [x] `setResourceData(rs)`
- [x] `getResourceData()`
- [x] `setBaselineData(bs)`
- [x] `getBaselineData()`
- [x] `applyTransaction({ add, update, remove })`

### 21b — Per-row mutation

- [x] `addTask(task, { parentId, atIndex })`
- [x] `updateTask(task)`
- [x] `removeTaskById(id)`
- [x] `addDependency(dep)`
- [x] `removeDependencyById(id)`
- [x] `moveTask(id, { parentId, toIndex })`
- [x] `indentTask(id)`
- [x] `outdentTask(id)`

### 21c — Scheduling

- [x] `reschedule(id, { start, end, duration })`
- [x] `scheduleProject()`
- [x] `setTaskProgress(id, value)`
- [x] `setTaskConstraint(id, { type, date })`

### 21d — Selection

- [x] `getSelectedTaskIds()`
- [x] `getSelectedTasks()`
- [x] `selectTask(id)`
- [x] `deselectTask(id)`
- [x] `selectRange(fromId, toId)`
- [x] `clearSelection()`
- [x] `getSelectedDependencyIds()`

### 21e — View / zoom

- [x] `setView(viewName)`
- [x] `getView()`
- [x] `zoomIn()`
- [x] `zoomOut()`
- [x] `zoomTo(view)`
- [x] `setColumnWidth(px)`
- [x] `fitProject()`
- [x] `scrollToTask(id, { align })`
- [x] `scrollToDate(date)`
- [x] `getVisibleRange()`

### 21f — Sidebar

- [x] `setSidebarColumns(cols)`
- [x] `getSidebarColumns()`
- [x] `setSidebarWidth(px)`
- [x] `setSidebarCollapsed(bool)`
- [x] `setColumnVisible(field, bool)`
- [x] `moveColumn(field, toIndex)`
- [x] `setSortField(field, dir)`
- [x] `setGroupBy(field)`
- [x] `getGroupBy()`

### 21g — Tree

- [x] `expandTask(id)`
- [x] `collapseTask(id)`
- [x] `expandAll()`
- [x] `collapseAll()`
- [x] `expandToLevel(n)`

### 21h — Critical path

- [x] `setCriticalPath(bool)`
- [x] `getCriticalPathIds()`
- [x] `getTaskSlack(id)`

### 21i — Baselines

- [x] `captureBaseline({ id, name })`
- [x] `setActiveBaseline(id)`
- [x] `clearBaseline(id)`

### 21j — Filter & search

- [x] `setQuickFilter(q)`
- [x] `getQuickFilter()`
- [x] `setTaskFilter(predicate)`
- [x] `getTaskFilter()`

### 21k — Hit testing

- [x] `taskFromPoint(x, y)`
- [x] `dateFromPoint(x, y)`
- [x] `rowFromPoint(x, y)`

### 21l — Drag programmatic

- [x] `beginDragTask(id, { mode })`
- [x] `endDrag({ commit, newStart, newEnd })`

### 21m — Persistence

- [x] `getGanttState()`
- [x] `applyGanttState(state)`
- [x] `clearPersistedState()`

### 21n — Export

- [x] `getDataAsJson()`
- [x] `getDataAsCsv({ columns })`
- [x] `getDataAsMsProjectXml()`
- [x] `setTaskDataFromMsProjectXml(xml)`
- [x] `printToPdf({ scale, paperSize, fitWidth })`
- [x] `exportImage({ format, range })`

### 21o — Detail panel

- [x] `openTaskDetail(id)`
- [x] `closeTaskDetail()`
- [ ] `isTaskDetailOpen()` — declared in REQUIREMENTS §8; verify
      against `gantt_detail_panel_controller.js`

### 21p — Library lifecycle (IIFE entry point)

- [x] `StimulusGantt.start(app?)`
- [x] `StimulusGantt.create(element, options)`
- [x] `StimulusGantt.destroy(element)`

## Phase 22 — Dispatched events coverage

Every `gantt:*` event documented in `REQUIREMENTS.md §9`. Each box
implies: dispatch from the right code path + assertion in a Vitest
spec (mostly under `test/api.test.js` or per-feature specs).

### 22a — Lifecycle

- [x] `gantt:ready` — `{ api }`
- [x] `gantt:viewChanged` — `{ view, columnWidth }`
- [x] `gantt:visibleRangeChanged` — `{ start, end, view }`

### 22b — Data-change

- [x] `gantt:taskDataChanged` — `{ tasks }`
- [x] `gantt:dependencyDataChanged` — `{ dependencies }`
- [x] `gantt:resourceDataChanged` — `{ resources }`

### 22c — Pointer / selection

- [x] `gantt:taskClicked` — `{ taskId, task, originalEvent }`
- [x] `gantt:taskDblClicked` — `{ taskId, task, originalEvent }`
- [x] `gantt:taskSelectionChanged` — `{ selectedTaskIds }`
- [x] `gantt:dependencySelectionChanged` — `{ selectedDependencyIds }`
- [x] `gantt:taskHovered` — `{ taskId, task }`
- [x] `gantt:dependencyHovered` — `{ dependencyId, dependency }`

### 22d — Mutation

- [x] `gantt:beforeUpdate` — `{ taskId, change }` (cancellable)
- [x] `gantt:taskMoved` — `{ taskId, oldStart, newStart, oldEnd, newEnd, delta }`
- [x] `gantt:taskResized` — `{ taskId, edge, oldStart, oldEnd, newStart, newEnd }`
- [x] `gantt:taskProgressChanged` — `{ taskId, oldValue, newValue }`
- [x] `gantt:taskReparented` — `{ taskId, fromParentId, toParentId, toIndex }`
- [x] `gantt:taskAdded` — `{ taskId, task }`
- [x] `gantt:taskRemoved` — `{ taskId, task }`
- [x] `gantt:beforeDependencyAdd` — cancellable
- [x] `gantt:beforeDependencyRemove` — cancellable
- [x] `gantt:dependencyAdded` — `{ dependencyId, dependency }`
- [x] `gantt:dependencyRemoved` — `{ dependencyId, dependency }`

### 22e — Scheduling / baselines

- [x] `gantt:criticalPathRecomputed` — `{ criticalTaskIds }`
- [x] `gantt:overallocationDetected` — `{ resourceId, intervals }`
      (debounced per interval)
- [x] `gantt:baselineCaptured` — `{ baselineId, name }`
- [x] `gantt:scheduleConflict` — `{ taskId, reason, attempted }`

### 22f — Sidebar / filter

- [x] `gantt:groupChanged` — `{ groupBy }`
- [x] `gantt:filterChanged` — `{ quickFilter, predicate }`
- [x] `gantt:ganttStateApplied` — `{ state }` (after `applyGanttState`
      / persist restore)

### 22g — Detail panel

- [x] `gantt:taskDetailOpened` — `{ taskId, task, panelEl }`
- [x] `gantt:taskDetailClosed` — `{ taskId, task, panelEl }`

### 22h — Files & broadcast

- [ ] `gantt:fileAttached` — `{ taskId, files, task, dataTransfer }`
      (cancellable) — declared, defer with `accept-files` per §1b
- [x] `gantt:broadcast:out` — `{ message }`
- [x] `gantt:broadcast:in` — `{ message }`

## Phase 23 — Acceptance criteria for v1 (per `REQUIREMENTS.md §24`)

These are the 20 ship-blockers. Each is a *roll-up* of the
fine-grained boxes above — when every contributing box is ticked,
tick the matching criterion here.

- [x]  1. HTML-first contract — server-rendered `<ol>` usable without
       JS (sidebar + plain-text dates render; no errors)
- [x]  2. Six views (`hour`, `day`, `week`, `month`, `quarter`,
       `year`) with correct headers, today highlight, non-working
       shading, now-indicator
- [x]  3. Drag, resize, link, progress on pointer + touch;
       multi-task drag preserves offsets; cancellable
       `gantt:beforeUpdate`; auto-scroll; date-tooltip
- [x]  4. Keyboard parity (drag + WBS nav + indent/outdent + zoom)
- [x]  5. Dependencies — FS / SS / FF / SF with all three routing
       modes; create-by-drag + delete-by-key; cancellable
       `gantt:beforeDependencyAdd`
- [x]  6. Auto-scheduling — push successors per dep type + lag;
       `strict` refuses + fires `gantt:scheduleConflict`
- [x]  7. Critical path — CPM forward + backward pass; highlighted
       red; recomputes within one frame of any mutation
- [x]  8. Baselines — overlay *and* compare layouts; multiple
       baselines coexist; `captureBaseline` + switch via `ganttApi`
- [x]  9. Calendars — per-task / per-resource / per-project compose;
       non-working time shaded; drag snaps over non-working spans
- [x] 10. Sidebar — 18 built-in columns, resize / reorder / sort /
       inline-edit; group-by injects synthetic group rows
- [x] 11. Renderers — separate label / bar / milestone / dependency
       registries; `<template>` path; ≥ 8 built-in bar renderers
- [x] 12. Resource histogram — toggle in, overallocation segments
       fire `gantt:overallocationDetected` exactly once per
       contiguous interval
- [x] 13. Virtualisation — auto-on past thresholds; 10k-task demo
       scrolls at 60 fps
- [x] 14. Quick filter + per-column sort + group-by + persisted
       state round-tripping through `localStorage`
- [ ] 15. Server-side task model — one fetch per viewport window,
       scroll-to-load, server-assigned position on move, server-side
       CPM result echoed back (deferred with `gem/demo`)
- [x] 16. Export — JSON, CSV, MS Project XML, PDF (client print),
       PNG / SVG snapshot — all round-trip on the documented
       fixture
- [ ] 17. Rails companion gem ships parallel to JS package,
       importmap-pinned, publishes Turbo Stream actions on every
       move / resize / link / progress edit; `gem/demo` covers a
       50-task project end-to-end (gem present; `gem/demo` deferred)
- [x] 18. Demos — 30+ HTML pages, vite-served, covering every
       capability + 6 industry scenarios
- [ ] 19. Tests green on CI for both JS package and Rails engine;
       CPM scheduler matches a published reference fixture
       (Ruby CI lands with `gem/demo`)
- [x] 20. Docs — `README.md` follows `stimulus_calendar` shape,
       `DESIGN.md`, `docs/REFERENCE.md`, `docs/MSPROJECT.md`,
       `docs/BROADCAST.md`, `docs/RAILS_REFERENCE.md`, both
       `skills/` guides

---

## Progress counter

At-a-glance view; tick a phase when every contributing box is ticked.

- [x] Phase 0 — JS scaffold
- [x] Phase 0a — Documentation, skills, gem skeleton
- [x] Phase 1 — HTML contract & dataset hydration
- [x] Phase 2 — Timeline views
- [x] Phase 3 — Editing
- [x] Phase 4 — Dependencies & arrow router
- [x] Phase 5 — Scheduler (CPM)
- [x] Phase 6 — Baselines
- [x] Phase 7 — Calendars & working time
- [x] Phase 8 — Sidebar (WBS)
- [x] Phase 9 — Renderers
- [x] Phase 10 — Resource histogram
- [x] Phase 11 — Virtualisation
- [x] Phase 12 — Filter, sort, group
- [x] Phase 13 — Persistence
- [x] Phase 14 — Live broadcasting
- [x] Phase 15 — Import / export
- [x] Phase 16 — Detail panel & inline editor
- [ ] Phase 17 — Rails companion gem (engine + DSL done; `gem/demo`
      pending)
- [x] Phase 18 — Demos & docs (a few screenshots still pending)
- [ ] Phase 19 — CI & release (Ruby job + gem release pending)
- [x] Phase 20 — Skills
- [x] Phase 21 — Public API coverage
- [x] Phase 22 — Dispatched events coverage
- [ ] Phase 23 — Acceptance criteria for v1 (3 ship-blockers
      outstanding: §15, §17, §19)
