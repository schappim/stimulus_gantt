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

## Phase 7 — Calendars (done)

- [x] Named calendar registry
- [x] Per-task / per-resource / per-project resolution
- [x] Non-working shading per view
- [x] `addBusinessDuration` / `durationBetween`

## Phase 8 — Sidebar (WBS) (done)

- [x] 18 built-in columns
- [x] Per-column width / align / hidden
- [x] WBS numbering injection
- [x] Group-by + sort hooks via API

## Phase 9 — Renderers (done)

- [x] Label / bar / milestone / dependency registries
- [x] Template-driven path via `<template>` + `data-bind*`
- [x] At least 8 built-in bar renderers
- [x] Per-task renderer override

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

## Phase 13 — Persistence (done)

- [x] `localStorage["sgantt:" + key]` round-trip
- [x] 200 ms debounce
- [x] View / sidebar / collapse / filter / baseline / critical

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

## Phase 17 — Rails companion gem

- [x] Gem skeleton: gemspec, engine, routes
- [x] `StimulusGanttRails::Gantt` DSL (fields, calendars, dependency types, hooks)
- [x] `Broadcastable` ActiveRecord concern
- [x] Tenant-scoped streams (ActsAsTenant integration point)
- [x] Turbo Stream custom actions
- [x] Importmap pins
- [ ] Demo Rails app under `gem/demo/` (skeleton only — full app deferred)
- [ ] Migration for opt-in audit log + undo/redo (deferred to a follow-up)
- [ ] `bin/rails test` suite (deferred)

## Phase 18 — Demos + docs (done)

- [x] 30+ HTML demos (Vite-served, importing `src/index.js`)
- [x] `demo/index.html` index
- [x] `README.md` — install / contract / attributes / API / events / renderers / calendars / Rails
- [x] `DESIGN.md` — module map + render pipeline
- [x] `RAILS.md` — checklist for hosts wiring up the gem
- [x] `docs/REFERENCE.md`, `docs/BROADCAST.md`, `docs/MSPROJECT.md`,
      `docs/RAILS_REFERENCE.md`

## Phase 19 — CI & release

- [ ] GitHub Actions workflow (Node matrix, build + test)
- [ ] Ruby workflow for the gem
- [ ] `prepublishOnly` gate (already wired in `package.json`)

## Phase 20 — Skills

- [x] `skills/stimulus-gantt-js/` LLM usage guide
- [x] `skills/stimulus-gantt-rails/` LLM usage guide
