# stimulus-gantt-js — usage skill

This skill teaches an LLM how to wire up `@ninjaai/stimulus_gantt` in a
plain-JS or Stimulus host. Pair with `stimulus-gantt-rails` when the
host is on Hotwire + Rails.

## When to use this skill

- The user mentions "Gantt chart", "task timeline", or "project plan
  view" in a Hotwire / Stimulus / vanilla JS / Vite project.
- The user has `data-controller="gantt"` markup already and wants to
  extend it.

## What to do

1. **Install** via npm: `npm install @ninjaai/stimulus_gantt
   @hotwired/stimulus`. Also import the stylesheet — `import
   '@ninjaai/stimulus_gantt/style.css'`.
2. **Bootstrap** by calling `StimulusGantt.start(application)` against
   the host's Stimulus application. If they don't have one, omit the
   argument and the call creates one for you.
3. **Author the chart as an `<ol>`**. The HTML is the data source. Use
   nested `<ol>` for summary tasks; the controller paints summary bars
   automatically. Use a hidden `<ol class="sg-dependencies">` for
   arrows.
4. **Configure** via `data-gantt-*-value` attributes:
   - `view` — `hour` / `day` / `week` / `month` / `quarter` / `year`.
   - `editable: true` to turn on drag / resize / link.
   - `task-link-editable: true` to allow drag-to-link.
   - `critical-path: true` to flag CPM.
   - `baseline: overlay | compare` once a baseline is captured.
   - `persist-key: my-plan` to round-trip view + filter + collapse via
     `localStorage`.
5. **Wire events** — every change fires a Stimulus-style event on the
   chart element. The cancellable ones (`gantt:beforeUpdate`,
   `gantt:beforeDependencyAdd`, `gantt:beforeDependencyRemove`,
   `gantt:fileAttached`) accept `event.preventDefault()` to veto.
6. **Imperative use** — after `gantt:ready`, `chart.ganttApi` is the
   public surface (`setTaskData`, `addDependency`,
   `captureBaseline`, `setView`, …).

## Common idioms

### Filter to a sprint window

```js
const sprint = { start: new Date('2026-06-01'), end: new Date('2026-06-14') };
chart.ganttApi.setTaskFilter((task) =>
  task.start && task.start >= sprint.start && task.start <= sprint.end);
```

### Add a dependency programmatically

```js
chart.ganttApi.addDependency({
  from: '1', to: '2', type: 'FS', lag: '2d',
});
```

### Capture and switch baselines

```js
chart.ganttApi.captureBaseline({ id: 'kickoff', name: 'Kickoff plan' });
chart.dataset.ganttBaselineValue = 'compare';
chart.ganttApi.setActiveBaseline('kickoff');
```

### Live-sync between tabs

```html
<div data-controller="gantt"
     data-gantt-editable-value="true"
     data-gantt-broadcast-value="broadcast-channel"
     data-gantt-broadcast-channel-value="project-42">
  …
</div>
```

### Custom bar renderer

```js
import { registerBarRenderer } from '@ninjaai/stimulus_gantt';
registerBarRenderer('annotated', (task) => {
  const el = document.createElement('div');
  el.className = 'sg-bar custom';
  el.dataset.taskId = task.id;
  el.innerHTML = `<span>★</span><span class="sg-bar-label">${task.name}</span>`;
  return el;
});
```

Reference the renderer per chart (`data-gantt-bar-renderer-value`) or
per task (`data-task-bar-renderer`).

## Pitfalls to avoid

- Do not call `setTaskData` BEFORE `gantt:ready`. Use the event.
- Do not assume the controller has rebuilt the DOM the same frame; if
  you read the bars right after mutating tasks, hook a
  `gantt:visibleRangeChanged` listener.
- Date strings without a timezone are treated as UTC midnight — feed
  ISO with `T...Z` for hour-view tasks.
- For 5k+ tasks set `data-gantt-row-virtualization-value="true"`
  explicitly; the default threshold is 200.

## When NOT to use

- The user wants Kanban columns → recommend `stimulus_kanban`.
- The user wants a month calendar → recommend `stimulus_calendar`.
- The user wants a generic data grid → recommend `stimulus_grid`.
- The user wants probabilistic PERT scheduling → not in scope.
