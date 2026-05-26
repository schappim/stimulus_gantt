# Changelog

All notable changes to `stimulus_gantt` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-05-26

### Added

- Initial release. Mirrors `REQUIREMENTS.md` §24 acceptance criteria:
  - HTML-first contract: `<ol class="sg-tasks">` is the source of truth.
  - Six views (`hour`, `day`, `week`, `month`, `quarter`, `year`).
  - Drag move + resize-start + resize-end, with cancellable
    `gantt:beforeUpdate` hook.
  - FS / SS / FF / SF dependency arrows with orthogonal / smooth /
    straight routing; drag-to-link affordance.
  - CPM forward + backward pass, slack, critical-path highlighting.
  - Baseline overlay + compare modes; multiple baselines.
  - Per-task / per-resource / per-project calendars; non-working
    shading; `addBusinessDuration` / `durationBetween` exposed.
  - WBS sidebar with 18 built-in columns, resizable, sortable,
    inline-editable, groupable.
  - Renderer registries (label / bar / milestone / dependency) plus a
    `<template>`-driven custom path.
  - Resource histogram panel + overallocation events.
  - Row + column virtualisation (10k-task demo at 60fps).
  - Quick filter, predicate filter, sort, group-by — all persisted via
    one `persist-key`.
  - JSON, CSV, MS Project XML, print/PDF export.
  - Transport-agnostic broadcast bus: BroadcastChannel, WebSocket,
    Action Cable, Turbo Streams adapters.
  - Public `ganttApi` documented in `README.md` and
    `docs/REFERENCE.md`.
  - Rails companion gem skeleton (`gem/stimulus_gantt_rails/`) with the
    declarative `Gantt` DSL, `Broadcastable` concern, custom Turbo
    Stream actions, importmap pins.
  - 30+ vite-served demo pages.
  - 97 Vitest specs (model / scheduler / calendar / DnD / arrows /
    renderers / API / virtual / export / broadcast / views).
