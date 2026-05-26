# stimulus_gantt — Build plan

Checklist per feature; tick as you go. Mirrors `REQUIREMENTS.md §24`
acceptance criteria.

## Phase 0 — Scaffolding (done)

- [x] `package.json`, `vite.config.js`, `vite.lib.config.js`, `vitest.config.js`
- [x] `.gitignore`, `LICENSE`
- [x] `src/index.js` public surface
- [x] First green Vitest run

## Phase 1 — HTML contract & basic render (done)

- [x] `<ol class="sg-tasks">` parsing (flat + nested)
- [x] `<ol class="sg-dependencies">` parsing
- [x] Stimulus values for every documented attribute
- [x] Sidebar + timeline DOM scaffolding
- [x] Day-view header + day-cell shading
- [x] Default bar renderer + label renderer

## Phase 2 — Six views (done)

- [x] `hour`, `day`, `week`, `month`, `quarter`, `year`
- [x] Header tiers (year/quarter, month/week, day/hour …)
- [x] Today highlight + now-indicator

## Phase 3 — Editing (done)

- [x] Drag move, resize-start, resize-end
- [x] Pointer-events based (touch + pen + mouse)
- [x] `gantt:beforeUpdate` cancellable hook
- [x] Auto-scroll on chart edges
- [x] Drag preview tooltip
- [x] Cancel-on-Esc
- [x] Multi-select bulk shift

## Phase 4 — Dependencies (done)

- [x] FS / SS / FF / SF anchor selection
- [x] Orthogonal / smooth / straight routing
- [x] Drag-to-create link affordance
- [x] Delete-on-key

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
