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
