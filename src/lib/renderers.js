// Renderer registries. Three independent registries:
//   - sidebar label  (sg-task label row renderer)
//   - bar            (timeline bar renderer)
//   - milestone      (zero-duration marker)
//
// Each registry maps name → render(task, ctx) → DOM Node.
// Hosts can register additional renderers via the named exports below
// and reference them with `data-task-renderer="<name>"` etc.

import { el, svg, applyBindings, cloneTemplate, setCssVar } from './dom.js';
import { toISODate } from './date.js';

const labelRegistry = new Map();
const barRegistry = new Map();
const milestoneRegistry = new Map();
const dependencyRegistry = new Map();

export function registerLabelRenderer(name, fn) { labelRegistry.set(name, fn); }
export function registerBarRenderer(name, fn) { barRegistry.set(name, fn); }
export function registerMilestoneRenderer(name, fn) { milestoneRegistry.set(name, fn); }
export function registerDependencyRenderer(name, fn) { dependencyRegistry.set(name, fn); }
export function getLabelRenderer(name) { return labelRegistry.get(name); }
export function getBarRenderer(name) { return barRegistry.get(name); }
export function getMilestoneRenderer(name) { return milestoneRegistry.get(name); }
export function getDependencyRenderer(name) { return dependencyRegistry.get(name); }

// --- Built-in label renderers ---------------------------------------------

registerLabelRenderer('default', (task, ctx) => {
  const row = el('div', { class: 'sg-row-label' });
  if (ctx?.wbsNumbering && ctx.wbsNumber) {
    row.appendChild(el('span', { class: 'sg-wbs' }, ctx.wbsNumber));
  }
  if (task.summary) {
    row.appendChild(el('button', {
      class: 'sg-expand',
      type: 'button',
      'data-task-id': task.id,
      'aria-expanded': task.collapsed ? 'false' : 'true',
      'data-action': 'click->gantt#toggleCollapsed',
    }, task.collapsed ? '▶' : '▼'));
  }
  const name = el('span', { class: 'sg-name' }, task.name || '');
  if (task.summary) name.classList.add('sg-name--summary');
  if (task.milestone) name.classList.add('sg-name--milestone');
  row.appendChild(name);
  return row;
});

registerLabelRenderer('template', (task, ctx) => {
  const node = cloneTemplate(ctx?.templateId);
  if (!node) return labelRegistry.get('default')(task, ctx);
  applyBindings(node, { ...task, wbs: ctx?.wbsNumber ?? '' });
  return node;
});

// --- Built-in bar renderers -----------------------------------------------

const BAR_RENDERERS = {
  default(task) {
    const bar = el('div', {
      class: 'sg-bar' + (task.summary ? ' sg-bar--summary' : '') + (task.locked ? ' sg-bar--locked' : ''),
      'data-task-id': task.id,
    });
    if (task.color) bar.style.background = task.color;
    if (task.textColor) bar.style.color = task.textColor;
    if (task.progress > 0) {
      bar.appendChild(el('div', {
        class: 'sg-bar-progress',
        style: { width: `${Math.round(task.progress * 100)}%` },
      }));
    }
    const label = el('div', { class: 'sg-bar-label' }, task.name || '');
    bar.appendChild(label);
    return bar;
  },
  'progress-stripe'(task) {
    const bar = el('div', {
      class: 'sg-bar sg-bar--progress-stripe',
      'data-task-id': task.id,
    });
    if (task.color) bar.style.background = task.color;
    setCssVar(bar, '--progress', `${Math.round((task.progress || 0) * 100)}%`);
    bar.appendChild(el('div', { class: 'sg-bar-label' }, task.name || ''));
    return bar;
  },
  'resource-stripes'(task, ctx) {
    const bar = el('div', { class: 'sg-bar sg-bar--resource-stripes', 'data-task-id': task.id });
    const ids = task.resourceIds || [];
    const stripes = el('div', { class: 'sg-bar-stripes' });
    for (const rid of ids) {
      const r = ctx?.resources?.find((x) => x.id === rid);
      stripes.appendChild(el('span', {
        class: 'sg-stripe',
        style: { background: r?.color || 'var(--sg-stripe-default, #94a3b8)' },
        title: r?.name || rid,
      }));
    }
    bar.appendChild(stripes);
    bar.appendChild(el('div', { class: 'sg-bar-label' }, task.name || ''));
    return bar;
  },
  summary(task) {
    const bar = el('div', { class: 'sg-bar sg-bar--summary', 'data-task-id': task.id });
    bar.appendChild(el('div', { class: 'sg-summary-cap sg-summary-cap--start' }));
    bar.appendChild(el('div', { class: 'sg-summary-body' }));
    bar.appendChild(el('div', { class: 'sg-summary-cap sg-summary-cap--end' }));
    return bar;
  },
  phase(task) {
    const bar = el('div', { class: 'sg-bar sg-bar--phase', 'data-task-id': task.id });
    bar.style.background = task.color || 'var(--sg-phase-color, #0ea5e9)';
    bar.appendChild(el('div', { class: 'sg-bar-label' }, task.name || ''));
    return bar;
  },
  'milestone-diamond'(task) {
    return BAR_RENDERERS.default(task);
  },
  flag(task) {
    const bar = el('div', { class: 'sg-bar sg-bar--flag', 'data-task-id': task.id });
    bar.appendChild(el('span', { class: 'sg-flag' }, '⚑'));
    bar.appendChild(el('div', { class: 'sg-bar-label' }, task.name || ''));
    return bar;
  },
  chevron(task) {
    const bar = el('div', { class: 'sg-bar sg-bar--chevron', 'data-task-id': task.id });
    bar.appendChild(el('div', { class: 'sg-bar-label' }, task.name || ''));
    return bar;
  },
  'actual-vs-planned'(task) {
    const wrapper = el('div', { class: 'sg-bar sg-bar--actual-vs-planned', 'data-task-id': task.id });
    wrapper.appendChild(el('div', { class: 'sg-bar-planned' }));
    if (task.actualStart && task.actualEnd) {
      wrapper.appendChild(el('div', { class: 'sg-bar-actual' }));
    }
    wrapper.appendChild(el('div', { class: 'sg-bar-label' }, task.name || ''));
    return wrapper;
  },
  template(task, ctx) {
    const node = cloneTemplate(ctx?.templateId);
    if (!node) return BAR_RENDERERS.default(task, ctx);
    applyBindings(node, {
      ...task,
      progress: `${Math.round((task.progress || 0) * 100)}%`,
      start: toISODate(task.start),
      end: toISODate(task.end),
    });
    if (!node.classList.contains('sg-bar')) node.classList.add('sg-bar');
    node.setAttribute('data-task-id', task.id);
    return node;
  },
};

for (const [name, fn] of Object.entries(BAR_RENDERERS)) registerBarRenderer(name, fn);

// --- Built-in milestone renderer -------------------------------------------

registerMilestoneRenderer('default', (task) => {
  const wrap = el('div', { class: 'sg-milestone-wrap', 'data-task-id': task.id });
  const node = svg('svg', { class: 'sg-milestone', viewBox: '0 0 16 16' });
  const poly = svg('polygon', {
    points: '8,0 16,8 8,16 0,8',
    fill: task.color || 'var(--sg-milestone-color, #ef4444)',
  });
  node.appendChild(poly);
  wrap.appendChild(node);
  if (task.name) wrap.appendChild(el('span', { class: 'sg-milestone-label' }, task.name));
  return wrap;
});

registerMilestoneRenderer('template', (task, ctx) => {
  const node = cloneTemplate(ctx?.templateId);
  if (!node) return getMilestoneRenderer('default')(task, ctx);
  applyBindings(node, task);
  return node;
});

// --- Dependency renderer (path string built upstream, wrapped here) -------

registerDependencyRenderer('default', ({ d, dep, color }) => {
  const path = svg('path', {
    d,
    class: 'sg-arrow',
    fill: 'none',
    stroke: color || dep.color || 'currentColor',
    'stroke-width': '1.5',
    'data-dependency-id': dep.id,
  });
  return path;
});

registerDependencyRenderer('dashed', ({ d, dep, color }) => {
  const path = svg('path', {
    d,
    class: 'sg-arrow sg-arrow--dashed',
    fill: 'none',
    stroke: color || dep.color || 'currentColor',
    'stroke-width': '1.5',
    'stroke-dasharray': '4 3',
    'data-dependency-id': dep.id,
  });
  return path;
});

export const labelRenderers = labelRegistry;
export const barRenderers = barRegistry;
export const milestoneRenderers = milestoneRegistry;
export const dependencyRenderers = dependencyRegistry;
