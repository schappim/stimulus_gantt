import { Application } from '@hotwired/stimulus';
import './styles/stimulus_gantt.css';
import GanttController from './controllers/gantt_controller.js';
import GanttSidebarController from './controllers/gantt_sidebar_controller.js';
import GanttBarController from './controllers/gantt_bar_controller.js';
import GanttDependencyController from './controllers/gantt_dependency_controller.js';
import GanttRowController from './controllers/gantt_row_controller.js';
import GanttToolbarController from './controllers/gantt_toolbar_controller.js';
import GanttHistogramController from './controllers/gantt_histogram_controller.js';
import GanttTaskEditorController from './controllers/gantt_task_editor_controller.js';
import GanttDetailPanelController from './controllers/gantt_detail_panel_controller.js';
import {
  registerLabelRenderer, registerBarRenderer, registerMilestoneRenderer,
  registerDependencyRenderer, getBarRenderer, getLabelRenderer,
  getMilestoneRenderer, getDependencyRenderer,
} from './lib/renderers.js';
import { addBusinessDuration, durationBetween, normalizeCalendar } from './lib/calendar.js';
import { parseDuration, formatDuration } from './lib/duration.js';
import { parseDate, toISO, toISODate, toISODateTime } from './lib/date.js';
import { scheduleProject, computeTaskSlack } from './lib/schedule.js';
import { resolveAdapter, BroadcastBus } from './lib/broadcast/index.js';
import { VERSION } from './lib/version.js';

export {
  GanttController,
  GanttSidebarController,
  GanttBarController,
  GanttDependencyController,
  GanttRowController,
  GanttToolbarController,
  GanttHistogramController,
  GanttTaskEditorController,
  GanttDetailPanelController,
  registerLabelRenderer,
  registerBarRenderer,
  registerMilestoneRenderer,
  registerDependencyRenderer,
  getBarRenderer,
  getLabelRenderer,
  getMilestoneRenderer,
  getDependencyRenderer,
  addBusinessDuration,
  durationBetween,
  normalizeCalendar,
  parseDuration,
  formatDuration,
  parseDate,
  toISO,
  toISODate,
  toISODateTime,
  scheduleProject,
  computeTaskSlack,
  resolveAdapter,
  BroadcastBus,
  VERSION,
};

/**
 * Register every stimulus_gantt controller against a Stimulus Application.
 * Pass an existing application instance to register into; omit to bootstrap
 * a fresh one (matching stimulus_grid / stimulus_calendar convention).
 */
export function start(app) {
  const application = app ?? Application.start();
  application.register('gantt', GanttController);
  application.register('gantt-sidebar', GanttSidebarController);
  application.register('gantt-bar', GanttBarController);
  application.register('gantt-dependency', GanttDependencyController);
  application.register('gantt-row', GanttRowController);
  application.register('gantt-toolbar', GanttToolbarController);
  application.register('gantt-histogram', GanttHistogramController);
  application.register('gantt-task-editor', GanttTaskEditorController);
  application.register('gantt-detail-panel', GanttDetailPanelController);
  return application;
}

const StimulusGantt = {
  start,
  GanttController,
  GanttSidebarController,
  GanttBarController,
  GanttDependencyController,
  GanttRowController,
  GanttToolbarController,
  GanttHistogramController,
  GanttTaskEditorController,
  GanttDetailPanelController,
  registerLabelRenderer,
  registerBarRenderer,
  registerMilestoneRenderer,
  registerDependencyRenderer,
  addBusinessDuration,
  durationBetween,
  parseDuration,
  formatDuration,
  parseDate,
  toISO,
  toISODate,
  scheduleProject,
  computeTaskSlack,
  resolveAdapter,
  BroadcastBus,
  VERSION,
};

export default StimulusGantt;

if (typeof window !== 'undefined' && !window.__stimulusGanttStarted) {
  window.__stimulusGanttStarted = true;
  window.StimulusGantt = StimulusGantt;
}
