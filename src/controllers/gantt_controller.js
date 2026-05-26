import { Controller } from '@hotwired/stimulus';

import { Store, buildTaskIndex, normalizeTask, normalizeDependency, taskToWireFormat, depToWireFormat } from '../lib/model.js';
import { parseDate, toISODate, toISO, addDays, startOfDay, isSameDay, minDate, maxDate, clampDate, diffDays, MS } from '../lib/date.js';
import { parseDuration } from '../lib/duration.js';
import { el, svg, emit, toggleClass, setCssVar, listen, applyAttrs } from '../lib/dom.js';
import { getView, VIEW_ORDER, zoomView } from '../views/index.js';
import { scheduleProject } from '../lib/schedule.js';
import { buildArrowPath, dependencyAnchors } from '../lib/arrows.js';
import { resolveTaskCalendar, normalizeCalendar, isWorkingDay, isWorkingTime } from '../lib/calendar.js';
import { rowWindow, columnWindow } from '../lib/virtual.js';
import { DragController } from '../lib/dnd.js';
import { getLabelRenderer, getBarRenderer, getMilestoneRenderer, getDependencyRenderer } from '../lib/renderers.js';
import { createGanttApi } from '../lib/api.js';
import { loadPersistedState, savePersistedState, clearPersistedState } from '../lib/persist.js';
import { resolveAdapter, BroadcastBus } from '../lib/broadcast/index.js';
import { parseJsonAttr, throttleRaf, debounce, clamp } from '../lib/utils.js';

const DEFAULT_SIDEBAR_COLUMNS = [
  { field: 'wbs',  header: '#',    width: 32, align: 'right', frozen: true },
  { field: 'name', header: 'Task', width: 220, frozen: true },
  { field: 'duration', header: 'Duration', width: 72 },
];

const PERSISTABLE_KEYS = [
  'viewName', 'columnWidth', 'sidebarWidthPx', 'sidebarCollapsedFlag',
  'quickFilter', 'collapsedIds', 'activeBaselineId', 'criticalPath',
  'sortField', 'sortDirection', 'groupBy',
];

export default class GanttController extends Controller {
  static values = {
    taskSource:        String,
    dependencySource:  String,
    resourceSource:    String,
    view:              { type: String, default: 'week' },
    views:             { type: Object, default: {} },
    date:              String,
    rangeStart:        String,
    rangeEnd:          String,
    autoFitRange:      { type: String, default: 'tasks' },
    columnWidth:       Number,
    rowHeight:         { type: Number, default: 32 },
    headerHeight:      { type: Number, default: 48 },
    sidebarWidth:      { type: Number, default: 328 },
    sidebarColumns:    { type: Array, default: [] },
    sidebarCollapsed:  { type: Boolean, default: false },
    firstDay:          { type: Number, default: 1 },
    nonWorkingDays:    { type: Array, default: [0, 6] },
    holidays:          { type: Array, default: [] },
    workingHours:      { type: Object, default: {} },
    calendar:          String,
    calendars:         { type: Object, default: {} },
    timeZone:          { type: String, default: 'local' },
    locale:            String,
    today:             String,
    nowIndicator:      { type: Boolean, default: true },
    taskSelection:     { type: String, default: 'single' },
    taskMultiSelectWithClick: Boolean,
    suppressTaskClickSelection: Boolean,
    editable:          { type: Boolean, default: false },
    taskStartEditable: Boolean,
    taskDurationEditable: Boolean,
    taskProgressEditable: Boolean,
    taskLinkEditable:  Boolean,
    snapDuration:      String,
    autoSchedule:      { type: Boolean, default: true },
    autoScheduleStrategy: { type: String, default: 'forward' },
    criticalPath:      Boolean,
    baseline:          { type: String, default: 'hidden' },
    baselineId:        String,
    progressDisplay:   { type: String, default: 'bar' },
    dependencyRouting: { type: String, default: 'orthogonal' },
    dependencyColor:   String,
    summaryRollup:     { type: Boolean, default: true },
    rowVirtualization: Boolean,
    rowVirtualThreshold: { type: Number, default: 200 },
    columnVirtualization: { type: Boolean, default: true },
    wbsNumbering:      Boolean,
    quickFilter:       String,
    readOnly:          Boolean,
    persistKey:        String,
    addTask:           Boolean,
    addDependencyAffordance: Boolean,
    broadcast:         String,
    broadcastChannel:  String,
    broadcastFilter:   String,
    printMode:         String,
    acceptFiles:       Boolean,
    showSlack:         Boolean,
    resourceHistogram: Boolean,
    filterMode:        { type: String, default: 'hide' },
    taskRenderer:      String,
    barRenderer:       String,
    milestoneRenderer: String,
    dependencyRenderer:String,
    taskEditor:        String,
  };

  initialize() {
    this.store = new Store();
    this.viewName = this.hasViewValue ? this.viewValue : 'week';
    this.columnWidth = this.hasColumnWidthValue && this.columnWidthValue
      ? this.columnWidthValue
      : getView(this.viewName).defaultColumnWidth;
    this.sidebarWidthPx = this.sidebarWidthValue;
    this.sidebarCollapsedFlag = this.sidebarCollapsedValue;
    this.sidebarColumns = this.sidebarColumnsValue?.length
      ? this.sidebarColumnsValue
      : DEFAULT_SIDEBAR_COLUMNS.slice();
    this.quickFilter = this.quickFilterValue || '';
    this.taskFilter = null;
    this.sortField = null;
    this.sortDirection = 'asc';
    this.groupBy = null;
    this.criticalPath = this.criticalPathValue;
    this._teardowns = [];
    this._renderScheduled = false;
    this._rerender = throttleRaf(() => this._render());
    this._persistDebounced = debounce(() => this._persist(), 200);
  }

  connect() {
    this._installRootDom();
    this._readInitialData();
    this._installBroadcast();
    this._installKeyboard();
    this._installAutoRefresh();
    this._restorePersistedState();
    if (this.hasTaskSourceValue && this.taskSourceValue) this._fetchSources();
    this._exposeApi();
    this._render();
    this.dispatch('ready', { detail: { api: this.element.ganttApi } });
  }

  disconnect() {
    for (const t of this._teardowns) t();
    this._teardowns = [];
    this._broadcast?.close?.();
    if (this._root) this._root.remove();
    delete this.element.ganttApi;
  }

  // -------------------- DOM scaffolding --------------------

  _installRootDom() {
    this._root = el('div', {
      class: 'sg-root',
      'data-sg-view': this.viewName,
    });
    setCssVar(this._root, '--sg-row-height', `${this.rowHeightValue}px`);
    setCssVar(this._root, '--sg-header-height', `${this.headerHeightValue}px`);
    setCssVar(this._root, '--sg-sidebar-width', `${this.sidebarWidthPx}px`);
    setCssVar(this._root, '--sg-column-width', `${this.columnWidth}px`);
    if (this.sidebarCollapsedFlag) this._root.classList.add('sg-sidebar-collapsed');

    this._toolbar = el('div', { class: 'sg-toolbar', 'data-sg-role': 'toolbar' });
    this._main = el('div', { class: 'sg-main' });
    this._sidebar = el('div', { class: 'sg-sidebar', 'data-sg-role': 'sidebar' });
    this._sidebarHeader = el('div', { class: 'sg-sidebar-header' });
    this._sidebarBody = el('div', { class: 'sg-sidebar-body' });
    // Inner sidebar wrapper: holds the rows, has an explicit height. We
    // never replace children on _sidebarBody itself — that would collapse
    // its scrollHeight to 0 momentarily and snap scrollTop to 0 (which
    // breaks vertical sync with the virtualised timeline). Position
    // relative so child rows (position: absolute) are anchored HERE,
    // not at the .sg-root that is the next positioned ancestor.
    this._sidebarRowsHost = el('div', {
      class: 'sg-sidebar-rows',
      style: { position: 'relative' },
    });
    this._timeline = el('div', { class: 'sg-timeline', 'data-sg-role': 'timeline' });
    this._timelineHeader = el('div', { class: 'sg-timeline-header' });
    this._timelineHeaderInner = el('div', { class: 'sg-timeline-header-inner' });
    this._timelineBody = el('div', { class: 'sg-timeline-body' });
    // Inner content wrapper inside the body. Owns the column-grid
    // background and an explicit width so it can be wider than the
    // viewport (horizontal scroll) or auto-extend to fill the viewport
    // (when the project span is shorter than the visible width).
    // Position relative so the absolute bars/rows layers anchor here.
    this._timelineContent = el('div', {
      class: 'sg-timeline-content',
      style: { position: 'relative' },
    });
    this._barsLayer = el('div', { class: 'sg-bars' });
    this._rowsLayer = el('div', { class: 'sg-rows' });
    this._nonWorkingLayer = el('div', { class: 'sg-nonworking' });
    this._arrowsLayer = svg('svg', { class: 'sg-arrows', xmlns: 'http://www.w3.org/2000/svg' });
    this._linkHandleLayer = el('div', { class: 'sg-link-handles' });
    this._nowLine = el('div', { class: 'sg-now-indicator' });
    this._dragGhost = el('div', { class: 'sg-drag-ghost', hidden: true });
    this._tooltip = el('div', { class: 'sg-tooltip', hidden: true });

    this._sidebarBody.append(this._sidebarRowsHost);
    this._sidebar.append(this._sidebarHeader, this._sidebarBody);
    this._timelineContent.append(
      this._nonWorkingLayer,
      this._rowsLayer,
      this._barsLayer,
      this._linkHandleLayer,
      this._arrowsLayer,
      this._nowLine,
      this._dragGhost,
      this._tooltip,
    );
    this._timelineBody.append(this._timelineContent);
    this._timelineHeader.append(this._timelineHeaderInner);
    this._timeline.append(this._timelineHeader, this._timelineBody);
    this._main.append(this._sidebar, this._timeline);
    this._root.append(this._toolbar, this._main);

    // Pull HTML-first task data BEFORE we replace the contents — the
    // semantic <ol> is the source of truth.
    this._htmlSources = this._readHtmlSources();

    this.element.append(this._root);
    this._installScrollSync();
    this._installPointerEvents();
    this._installResizeObserver();
  }

  _installResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;
    this._resizeObserver = new ResizeObserver(() => this._rerender());
    this._resizeObserver.observe(this._timelineBody);
    this._teardowns.push(() => this._resizeObserver?.disconnect());
  }

  _readHtmlSources() {
    const taskList = this.element.querySelector(':scope > ol.sg-tasks');
    const depList = this.element.querySelector(':scope > ol.sg-dependencies');
    const tasks = [];
    if (taskList) {
      this._walkTaskList(taskList, null, tasks);
      taskList.remove();
    }
    const deps = [];
    if (depList) {
      for (const li of depList.querySelectorAll('[data-dependency-id], [data-dependency-from]')) {
        const dep = normalizeDependency(li);
        if (dep) deps.push(dep);
      }
      depList.remove();
    }
    return { tasks, deps };
  }

  _walkTaskList(list, parentId, acc) {
    for (const li of Array.from(list.children)) {
      if (li.tagName !== 'LI') continue;
      const task = normalizeTask(li);
      if (!task) continue;
      task.parentId = parentId ?? task.parentId;
      acc.push(task);
      const childList = li.querySelector(':scope > ol');
      if (childList) {
        task.summary = true;
        this._walkTaskList(childList, task.id, acc);
      }
    }
  }

  _readInitialData() {
    if (this._htmlSources?.tasks?.length) this.store.tasks = this._htmlSources.tasks;
    if (this._htmlSources?.deps?.length) this.store.dependencies = this._htmlSources.deps;
    if (this.hasCalendarsValue) this.store.calendars = this.calendarsValue;
    if (this.hasCalendarValue) this.store.projectCalendarId = this.calendarValue;
  }

  async _fetchSources() {
    try {
      const resp = await fetch(this.taskSourceValue, { headers: { Accept: 'application/json' } });
      if (!resp.ok) throw new Error(`task source HTTP ${resp.status}`);
      const data = await resp.json();
      if (Array.isArray(data?.tasks)) this.store.setTasks(data.tasks);
      else if (Array.isArray(data)) this.store.setTasks(data);
      if (Array.isArray(data?.dependencies)) this.store.setDependencies(data.dependencies);
      if (Array.isArray(data?.resources)) this.store.setResources(data.resources);
      if (Array.isArray(data?.baselines)) this.store.setBaselines(data.baselines);
      if (data?.calendars) this.store.calendars = { ...this.store.calendars, ...data.calendars };
      this._rerender();
    } catch (err) {
      console.warn('[stimulus_gantt] task source fetch failed', err);
    }
  }

  _installBroadcast() {
    if (!this.hasBroadcastValue || !this.broadcastValue) return;
    const adapter = resolveAdapter(this.broadcastValue, this.broadcastChannelValue);
    if (!adapter) return;
    const filter = this.broadcastFilterValue
      ? parseJsonAttr(this.broadcastFilterValue, null) : null;
    this._broadcast = new BroadcastBus(adapter, {
      filter: typeof filter === 'function' ? filter : null,
    });
    this._teardowns.push(this._broadcast.subscribe((message) => {
      this.dispatch('broadcast:in', { detail: { message } });
      this._applyInboundBroadcast(message);
    }));
  }

  _applyInboundBroadcast(message) {
    if (!message) return;
    const { op, payload } = message;
    switch (op) {
      case 'task-add':
      case 'task-update':
        if (payload?.task) this.store.upsertTask(payload.task);
        break;
      case 'task-remove':
        if (payload?.taskId != null) this.store.removeTaskById(payload.taskId);
        break;
      case 'dependency-add':
        if (payload?.dependency) this.store.upsertDependency(payload.dependency);
        break;
      case 'dependency-remove':
        if (payload?.dependencyId != null) this.store.removeDependencyById(payload.dependencyId);
        break;
      case 'bulk':
        if (payload) this.store.applyTransaction(payload);
        break;
    }
    this._rerender();
  }

  _publishBroadcast(op, payload) {
    if (!this._broadcast) return;
    const message = { op, payload };
    this.dispatch('broadcast:out', { detail: { message } });
    this._broadcast.publish(message);
  }

  _installKeyboard() {
    this._teardowns.push(listen(this._root, 'keydown', (e) => this._onKeydown(e)));
    this._root.tabIndex = 0;
  }

  _installAutoRefresh() {
    this._teardowns.push(this.store.subscribe(() => this._rerender()));
  }

  _installScrollSync() {
    let lock = false;
    const sync = (src, ...others) => {
      if (lock) return;
      lock = true;
      for (const o of others) o.scrollTop = src.scrollTop;
      lock = false;
    };
    this._teardowns.push(listen(this._sidebarBody, 'scroll', () => sync(this._sidebarBody, this._timelineBody)));
    this._teardowns.push(listen(this._timelineBody, 'scroll', () => {
      this._timelineHeader.scrollLeft = this._timelineBody.scrollLeft;
      sync(this._timelineBody, this._sidebarBody);
      this._rerender();
    }));
  }

  _installPointerEvents() {
    this._teardowns.push(listen(this._timelineBody, 'pointerdown', (e) => this._onTimelinePointerDown(e)));
  }

  _exposeApi() {
    this.element.ganttApi = createGanttApi(this);
  }

  // -------------------- public methods used by the API --------------------

  rerender() { this._rerender(); }
  refreshSelection() { this._renderSelection(); }

  setView(name) {
    if (!VIEW_ORDER.includes(name)) return;
    this.viewName = name;
    this.columnWidth = getView(name).defaultColumnWidth;
    setCssVar(this._root, '--sg-column-width', `${this.columnWidth}px`);
    this._root.dataset.sgView = name;
    this._rerender();
    this.dispatch('viewChanged', { detail: { view: name, columnWidth: this.columnWidth } });
  }

  zoom(delta) { this.setView(zoomView(this.viewName, delta)); }

  fitProject() {
    const range = this._projectRange();
    if (!range.start || !range.end) return;
    this._customRangeStart = startOfDay(range.start);
    this._customRangeEnd = startOfDay(range.end);
    this._rerender();
  }

  scrollToTask(id) {
    const t = this.store.tasks.find((x) => x.id === id);
    if (!t || !t.start) return;
    this.scrollToDate(t.start);
  }

  scrollToDate(date) {
    const range = this._visibleRangeBoundaries();
    const view = getView(this.viewName);
    const slot = view.slotForDate(date, range.start);
    this._timelineBody.scrollLeft = slot * this.columnWidth - this.columnWidth;
  }

  getVisibleRange() {
    const range = this._visibleRangeBoundaries();
    return { start: range.start, end: range.end, view: this.viewName };
  }

  setSidebarColumns(cols) { this.sidebarColumns = cols.slice(); }
  setSidebarWidth(px) {
    this.sidebarWidthPx = Math.max(40, px);
    setCssVar(this._root, '--sg-sidebar-width', `${this.sidebarWidthPx}px`);
    this._rerender();
  }
  setSidebarCollapsed(bool) {
    this.sidebarCollapsedFlag = !!bool;
    toggleClass(this._root, 'sg-sidebar-collapsed', this.sidebarCollapsedFlag);
  }

  toggleCollapsed(event) {
    const btn = event.target.closest('[data-task-id]');
    if (!btn) return;
    const id = btn.dataset.taskId;
    if (this.store.collapsed.has(id)) this.store.collapsed.delete(id);
    else this.store.collapsed.add(id);
    this._rerender();
  }

  // Hit-tests
  taskFromPoint(x, y) {
    const node = document.elementFromPoint(x, y);
    if (!node) return null;
    const bar = node.closest?.('[data-task-id]');
    if (!bar) return null;
    const id = bar.dataset.taskId;
    return this.store.tasks.find((t) => t.id === id) ?? null;
  }
  dateFromPoint(x, y) {
    const body = this._timelineBody.getBoundingClientRect();
    const rel = x - body.left + this._timelineBody.scrollLeft;
    const range = this._visibleRangeBoundaries();
    const view = getView(this.viewName);
    const slot = Math.floor(rel / this.columnWidth);
    return view.dateForSlot(slot, range.start);
  }
  rowFromPoint(x, y) {
    const body = this._timelineBody.getBoundingClientRect();
    const rel = y - body.top + this._timelineBody.scrollTop;
    return Math.floor(rel / this.rowHeightValue);
  }

  beginDragTask(id, mode = 'move') {
    const task = this.store.tasks.find((t) => t.id === String(id));
    if (!task) return null;
    if (!this._drag) this._ensureDragController();
    this._drag.beginProgrammatic({
      taskId: String(id),
      mode,
      originStart: task.start,
      originEnd: task.end,
    });
    return this._drag;
  }

  endDrag({ commit = true, newStart, newEnd } = {}) {
    if (!this._drag) return;
    if (newStart) this._drag.updateProgrammatic({ newStart, newEnd: newEnd ?? this._drag.active?.newEnd });
    if (commit) this._drag.commit(null);
    else this._drag.cancel(null);
  }

  serialiseState() {
    const state = {};
    state.viewName = this.viewName;
    state.columnWidth = this.columnWidth;
    state.sidebarWidthPx = this.sidebarWidthPx;
    state.sidebarCollapsedFlag = this.sidebarCollapsedFlag;
    state.quickFilter = this.quickFilter;
    state.collapsedIds = Array.from(this.store.collapsed);
    state.activeBaselineId = this.store.activeBaselineId;
    state.criticalPath = this.criticalPath;
    state.sortField = this.sortField;
    state.sortDirection = this.sortDirection;
    state.groupBy = this.groupBy;
    return state;
  }

  applyState(state) {
    if (!state) return;
    if (state.viewName) this.viewName = state.viewName;
    if (state.columnWidth) this.columnWidth = state.columnWidth;
    if (state.sidebarWidthPx) this.sidebarWidthPx = state.sidebarWidthPx;
    if (typeof state.sidebarCollapsedFlag === 'boolean') this.sidebarCollapsedFlag = state.sidebarCollapsedFlag;
    if (state.quickFilter != null) this.quickFilter = state.quickFilter;
    if (Array.isArray(state.collapsedIds)) {
      this.store.collapsed = new Set(state.collapsedIds);
    }
    this.store.activeBaselineId = state.activeBaselineId ?? null;
    if (typeof state.criticalPath === 'boolean') this.criticalPath = state.criticalPath;
    if (state.sortField) this.sortField = state.sortField;
    if (state.sortDirection) this.sortDirection = state.sortDirection;
    if (state.groupBy) this.groupBy = state.groupBy;
    setCssVar(this._root, '--sg-column-width', `${this.columnWidth}px`);
    setCssVar(this._root, '--sg-sidebar-width', `${this.sidebarWidthPx}px`);
    this._root.dataset.sgView = this.viewName;
    toggleClass(this._root, 'sg-sidebar-collapsed', this.sidebarCollapsedFlag);
  }

  clearPersistedState() {
    if (this.hasPersistKeyValue) clearPersistedState(this.persistKeyValue);
  }

  openTaskDetail(id) {
    const task = this.store.tasks.find((t) => t.id === id);
    if (!task) return;
    const tplId = this.element.querySelector('template#task-detail-tpl') ? 'task-detail-tpl' : null;
    let panel;
    if (tplId) {
      const tpl = document.getElementById(tplId);
      panel = tpl.content.firstElementChild?.cloneNode(true);
    } else {
      panel = el('div', { class: 'sg-detail-default' });
      panel.appendChild(el('h3', {}, task.name));
      panel.appendChild(el('p', {}, `${toISODate(task.start) ?? ''} → ${toISODate(task.end) ?? ''}`));
    }
    panel.dataset.sgRole = 'task-detail-panel';
    panel.dataset.taskId = task.id;
    if (this._detailPanel) this._detailPanel.remove();
    this._root.appendChild(panel);
    this._detailPanel = panel;
    this.dispatch('taskDetailOpened', { detail: { taskId: task.id, task: taskToWireFormat(task), panelEl: panel } });
  }

  closeTaskDetail() {
    if (!this._detailPanel) return;
    const id = this._detailPanel.dataset.taskId;
    this._detailPanel.remove();
    this._detailPanel = null;
    this.dispatch('taskDetailClosed', { detail: { taskId: id } });
  }

  exportImage() {
    if (typeof XMLSerializer === 'undefined') return null;
    const clone = this._main.cloneNode(true);
    return new XMLSerializer().serializeToString(clone);
  }

  // -------------------- rendering --------------------

  _projectRange() {
    let start = null;
    let end = null;
    for (const t of this.store.tasks) {
      if (t.start && (start == null || t.start < start)) start = t.start;
      if (t.end && (end == null || t.end > end)) end = t.end;
      if (!t.end && t.start && (end == null || t.start > end)) end = t.start;
    }
    return { start, end };
  }

  _visibleRangeBoundaries() {
    if (this._customRangeStart && this._customRangeEnd) {
      return { start: this._customRangeStart, end: this._customRangeEnd };
    }
    if (this.hasRangeStartValue && this.hasRangeEndValue) {
      return {
        start: parseDate(this.rangeStartValue) ?? new Date(),
        end: parseDate(this.rangeEndValue) ?? new Date(),
      };
    }
    const range = this._projectRange();
    const view = getView(this.viewName);
    let start;
    let end;
    if (range.start && range.end) {
      start = view.startOfRange(range.start);
      end = view.endOfRange(range.end);
      // Pad to at least 8 cells.
      while (view.columnsBetween(start, end) < 8) {
        end = view.addSlots(end, 1);
      }
    } else {
      const anchor = this.hasDateValue && this.dateValue
        ? parseDate(this.dateValue)
        : new Date();
      start = view.startOfRange(anchor);
      end = view.addSlots(start, 12);
    }
    // Extend to fill the viewport so the chart doesn't look orphaned
    // when the project span is shorter than the available width.
    const vw = this._timelineBody?.clientWidth || 0;
    if (vw > 0 && this.columnWidth > 0) {
      const cur = view.columnsBetween(start, end);
      const want = Math.floor(vw / this.columnWidth);
      if (want > cur) end = view.addSlots(end, want - cur);
    }
    return { start, end };
  }

  _today() {
    if (this.hasTodayValue && this.todayValue) return parseDate(this.todayValue);
    return new Date();
  }

  _visibleTasks() {
    const idx = buildTaskIndex(this.store.tasks);
    const order = idx.order;
    const filterText = (this.quickFilter || '').trim().toLowerCase();
    const filterFn = this.taskFilter;
    const hide = this.filterModeValue === 'hide';
    const out = [];
    const collapsedAnc = new Set();

    // Build set of collapsed ancestor descendants.
    for (const id of order) {
      const t = idx.byId.get(id);
      const parent = t.parentId;
      const parentCollapsed = parent && (this.store.collapsed.has(parent) || collapsedAnc.has(parent));
      if (parentCollapsed) {
        collapsedAnc.add(id);
        continue;
      }
      const matches = !filterText || (`${t.name} ${t.id}`).toLowerCase().includes(filterText);
      const customOk = !filterFn || filterFn(t);
      if (hide && (!matches || !customOk)) continue;
      out.push({ ...t, _hidden: !matches || !customOk });
    }
    return { tasks: out, index: idx };
  }

  _render() {
    const range = this._visibleRangeBoundaries();
    const view = getView(this.viewName);
    const columns = view.columnsBetween(range.start, range.end);

    // Resize layers. The content wrapper takes the FINAL width; layers
    // fill that. The header inner matches so it scrolls in sync.
    const contentWidth = columns * this.columnWidth;
    this._timelineContent.style.width = `${contentWidth}px`;
    this._timelineHeaderInner.style.width = `${contentWidth}px`;
    this._barsLayer.style.width = `${contentWidth}px`;
    this._rowsLayer.style.width = `${contentWidth}px`;
    this._nonWorkingLayer.style.width = `${contentWidth}px`;
    this._linkHandleLayer.style.width = `${contentWidth}px`;
    this._arrowsLayer.setAttribute('width', contentWidth);
    this._arrowsLayer.style.width = `${contentWidth}px`;

    // Header.
    this._renderHeader(view, range, columns);
    // Non-working shading.
    this._renderNonWorking(view, range, columns);
    // Sidebar header + body.
    this._renderSidebar();
    // Tasks (bars + sidebar rows).
    this._renderRowsAndBars(view, range);
    // Dependency arrows.
    this._renderArrows(view, range);
    // Now indicator.
    this._renderNowIndicator(view, range);
    // Critical path mark.
    if (this.criticalPath || this.criticalPathValue) this._applyCriticalPath();
    // Persistence.
    this._persistDebounced();
    this.dispatch('visibleRangeChanged', {
      detail: { start: range.start, end: range.end, view: this.viewName },
    });
  }

  _renderHeader(view, range, columns) {
    const head = view.buildHeader(range.start, range.end);
    this._timelineHeaderInner.replaceChildren();
    for (const tier of head.tiers) {
      const row = el('div', { class: `sg-header-row ${tier.className || ''}` });
      for (const cell of tier.cells) {
        const c = el('div', {
          class: 'sg-header-cell',
          style: { width: `${cell.span * this.columnWidth}px` },
        });
        // Multi-line labels survive as <br>.
        for (const part of String(cell.label).split('\n')) {
          if (c.children.length) c.appendChild(el('br'));
          c.appendChild(document.createTextNode(part));
        }
        row.appendChild(c);
      }
      this._timelineHeaderInner.appendChild(row);
    }
    this._timelineHeader.style.height = `${this.headerHeightValue}px`;
    setCssVar(this._root, '--sg-tier-count', String(head.tiers.length));
  }

  _renderNonWorking(view, range, columns) {
    this._nonWorkingLayer.replaceChildren();
    if (view.name === 'year' || view.name === 'quarter') return;
    const projectCal = normalizeCalendar(
      this.store.calendars?.[this.calendarValue ?? this.store.projectCalendarId] ?? null
    );
    const nwDays = new Set((this.nonWorkingDaysValue || [0, 6]));
    const holidays = new Set([
      ...(this.holidaysValue || []),
      ...(projectCal.holidays || []),
    ]);
    let cursor = view.startOfRange(range.start);
    let slot = 0;
    while (cursor < range.end) {
      const next = view.addSlots(cursor, 1);
      const iso = toISODate(cursor);
      const dow = cursor.getUTCDay();
      const nonWorking = (view.name === 'day' || view.name === 'hour' || view.name === 'week')
        ? (nwDays.has(dow) || holidays.has(iso))
        : false;
      if (nonWorking) {
        const cell = el('div', {
          class: 'sg-nonworking-cell',
          style: {
            left: `${slot * this.columnWidth}px`,
            width: `${this.columnWidth}px`,
          },
        });
        this._nonWorkingLayer.appendChild(cell);
      }
      cursor = next;
      slot++;
      if (slot > 1500) break;
    }
  }

  _renderSidebar() {
    // Header
    this._sidebarHeader.replaceChildren();
    const hRow = el('div', { class: 'sg-sidebar-row sg-sidebar-row--header' });
    for (const col of this.sidebarColumns) {
      if (col.hidden) continue;
      const c = el('div', {
        class: `sg-sidebar-cell sg-sidebar-cell--${col.field}`,
        style: { width: `${col.width || 100}px`, textAlign: col.align || 'left' },
        'data-field': col.field,
      }, col.header || col.field);
      hRow.appendChild(c);
    }
    this._sidebarHeader.appendChild(hRow);
    this._sidebarHeader.style.height = `${this.headerHeightValue}px`;
  }

  _renderRowsAndBars(view, range) {
    const { tasks, index } = this._visibleTasks();
    const totalHeight = tasks.length * this.rowHeightValue;
    // Explicit heights on the host containers. Critical: setting an
    // explicit height on _sidebarRowsHost (not on _sidebarBody) means we
    // can replaceChildren on the host without collapsing the body's
    // scrollHeight to 0 — which would snap scrollTop to 0 and break the
    // virtualised sidebar (the sidebar would scroll back to the top on
    // every render).
    this._sidebarRowsHost.style.height = `${totalHeight}px`;
    this._timelineContent.style.height = `${totalHeight}px`;
    this._barsLayer.style.height = `${totalHeight}px`;
    this._rowsLayer.style.height = `${totalHeight}px`;
    this._nonWorkingLayer.style.height = `${totalHeight}px`;
    this._linkHandleLayer.style.height = `${totalHeight}px`;
    this._arrowsLayer.setAttribute('height', totalHeight);
    this._arrowsLayer.style.height = `${totalHeight}px`;

    // Virtualisation window. Use threshold.
    const virtualise = this.rowVirtualizationValue
      || tasks.length > this.rowVirtualThresholdValue;
    const viewport = this._timelineBody.clientHeight || 480;
    const scrollTop = this._timelineBody.scrollTop;
    const rowWin = virtualise
      ? rowWindow({ count: tasks.length, rowHeight: this.rowHeightValue, scrollTop, viewport })
      : { startIndex: 0, endIndex: tasks.length, paddingTop: 0, paddingBottom: 0 };

    // Clear and re-render the visible window. All rows are absolutely
    // positioned inside their host (which has explicit height) so
    // scrollTop survives the wipe.
    this._sidebarRowsHost.replaceChildren();
    this._barsLayer.replaceChildren();
    this._rowsLayer.replaceChildren();
    this._linkHandleLayer.replaceChildren();

    this._taskRowEls = new Map();
    this._taskBarEls = new Map();

    for (let i = rowWin.startIndex; i < rowWin.endIndex; i++) {
      const t = tasks[i];
      if (!t) continue;
      const wbsNumber = (t.path || []).join('.');
      // Sidebar row — absolute-positioned at i * rowHeight.
      const sRow = el('div', {
        class: `sg-sidebar-row ${t.summary ? 'sg-sidebar-row--summary' : ''} ${t.milestone ? 'sg-sidebar-row--milestone' : ''}`,
        'data-task-id': t.id,
        style: {
          position: 'absolute',
          left: '0',
          right: '0',
          top: `${i * this.rowHeightValue}px`,
          height: `${this.rowHeightValue}px`,
          paddingLeft: `${(t.depth || 0) * 14}px`,
        },
      });
      for (const col of this.sidebarColumns) {
        if (col.hidden) continue;
        const value = this._sidebarValue(t, col.field, wbsNumber);
        const cell = el('div', {
          class: `sg-sidebar-cell sg-sidebar-cell--${col.field}`,
          style: { width: `${col.width || 100}px`, textAlign: col.align || 'left' },
        });
        if (col.field === 'name') {
          const labelRenderer = getLabelRenderer(this._labelRendererName(t)) || getLabelRenderer('default');
          const labelNode = labelRenderer(t, {
            wbsNumbering: this.wbsNumberingValue,
            wbsNumber,
            templateId: this._labelTemplateId(t),
            resources: this.store.resources,
          });
          cell.appendChild(labelNode);
        } else {
          cell.textContent = value;
        }
        sRow.appendChild(cell);
      }
      this._sidebarRowsHost.appendChild(sRow);
      this._taskRowEls.set(t.id, sRow);

      // Timeline row.
      const timelineRow = el('div', {
        class: 'sg-row',
        'data-task-id': t.id,
        style: { top: `${i * this.rowHeightValue}px`, height: `${this.rowHeightValue}px` },
      });
      this._rowsLayer.appendChild(timelineRow);

      // Bar (or milestone) — skip if no dates.
      if (!t.start) continue;
      const barNode = this._renderTaskBar(t, view, range, i);
      if (barNode) {
        this._barsLayer.appendChild(barNode);
        this._taskBarEls.set(t.id, barNode);
        // Link handle as a sibling, positioned just past the bar's right
        // edge. Lives in its own layer so it can overflow past the bar
        // without fighting the bar's overflow: hidden.
        if (this._isLinkEditable() && !t.locked && !t.milestone) {
          const left = parseFloat(barNode.style.left) || 0;
          const width = parseFloat(barNode.style.width) || 0;
          const top = (parseFloat(barNode.style.top) || 0)
            + ((parseFloat(barNode.style.height) || this.rowHeightValue) / 2)
            - 6;
          const linkHandle = el('div', {
            class: 'sg-link-handle',
            'data-task-id': t.id,
            'data-handle': 'link',
            style: { left: `${left + width - 2}px`, top: `${top}px` },
          });
          this._linkHandleLayer.appendChild(linkHandle);
        }
      }
      // Baseline.
      if (this.baselineValue !== 'hidden') {
        const baselineNode = this._renderBaseline(t, view, range, i);
        if (baselineNode) this._barsLayer.appendChild(baselineNode);
      }
    }
  }

  _sidebarValue(t, field, wbsNumber) {
    switch (field) {
      case 'wbs':      return wbsNumber;
      case 'name':     return t.name;
      case 'start':    return toISODate(t.start) ?? '';
      case 'end':      return toISODate(t.end) ?? '';
      case 'duration': return t.durationRaw ?? this._formatDuration(t);
      case 'progress': return `${Math.round((t.progress ?? 0) * 100)}%`;
      case 'effort':   return t.effort ? this._formatDuration({ duration: t.effort }) : '';
      case 'resources': return (t.resourceIds || []).map((id) => {
        const r = this.store.resources.find((x) => x.id === id);
        return r?.name || id;
      }).join(', ');
      case 'predecessors':
        return this.store.dependencies.filter((d) => d.to === t.id)
          .map((d) => `${d.from}${d.type}`).join(', ');
      case 'actual-start': return toISODate(t.actualStart) ?? '';
      case 'actual-end':   return toISODate(t.actualEnd) ?? '';
      case 'slack': {
        const sched = scheduleProject(this.store);
        const row = sched.byId.get(t.id);
        return row?.slack != null ? `${row.slack}d` : '';
      }
      case 'critical': {
        const sched = scheduleProject(this.store);
        return sched.criticalTaskIds.has(t.id) ? '●' : '';
      }
      case 'cost':         return t.cost ?? '';
      case 'priority':     return t.priority ?? '';
      case 'status':       return this._statusOf(t);
      case 'indicators':   return this._indicatorsOf(t);
      default:             return t[field] ?? '';
    }
  }

  _formatDuration(t) {
    const d = t.duration;
    if (!d) return '';
    if (d.days) return `${d.days}d`;
    if (d.seconds) return `${Math.round(d.seconds / 3600)}h`;
    return '';
  }

  _statusOf(t) {
    if (!t.end) return '';
    const now = this._today();
    if (t.progress >= 1) return 'Done';
    if (t.end < now) return 'Late';
    if (t.start && t.start <= now) return 'In progress';
    return 'Not started';
  }

  _indicatorsOf(t) {
    const items = [];
    if (t.locked) items.push('🔒');
    if (t.milestone) items.push('◆');
    if (t.constraintType) items.push('⚓');
    return items.join(' ');
  }

  _labelRendererName(t) {
    if (t.renderer) return t.renderer === 'default' ? 'default' : 'template';
    if (this.hasTaskRendererValue && this.taskRendererValue) return 'template';
    return 'default';
  }

  _labelTemplateId(t) {
    return t.renderer || (this.hasTaskRendererValue ? this.taskRendererValue : null);
  }

  _renderTaskBar(t, view, range, rowIndex) {
    const slotStart = view.slotForDate(t.start, range.start);
    const end = t.end ?? t.start;
    const slotEnd = view.slotForDate(end, range.start);
    const left = slotStart * this.columnWidth;
    const widthSlots = Math.max(1, slotEnd - slotStart);
    let width = Math.max(8, widthSlots * this.columnWidth);

    if (t.milestone) {
      const milestoneRenderer = getMilestoneRenderer(
        t.renderer === 'milestone' ? 'template' : 'default'
      ) || getMilestoneRenderer('default');
      const node = milestoneRenderer(t, {});
      node.classList.add('sg-bar-positioned');
      Object.assign(node.style, {
        left: `${left}px`,
        top: `${rowIndex * this.rowHeightValue}px`,
        width: '16px',
        height: `${this.rowHeightValue}px`,
      });
      node.dataset.taskId = t.id;
      return node;
    }

    const rendererName = t.barRenderer
      || (this.hasBarRendererValue && this.barRendererValue ? 'template' : 'default');
    const renderer = getBarRenderer(rendererName) || getBarRenderer('default');
    const node = renderer(t, {
      templateId: this.hasBarRendererValue ? this.barRendererValue : null,
      resources: this.store.resources,
    });
    if (!node.classList.contains('sg-bar')) node.classList.add('sg-bar');
    node.dataset.taskId = t.id;
    node.classList.add('sg-bar-positioned');
    Object.assign(node.style, {
      left: `${left}px`,
      top: `${rowIndex * this.rowHeightValue + 4}px`,
      width: `${width}px`,
      height: `${this.rowHeightValue - 8}px`,
    });

    // Resize handles when editable. The link handle lives in its own
    // layer (added in _renderRowsAndBars) so it can extend past the bar
    // without fighting overflow: hidden.
    if (this._isEditable() && !t.locked && !t.milestone) {
      node.appendChild(el('div', { class: 'sg-bar-handle sg-bar-handle--start', 'data-handle': 'start' }));
      node.appendChild(el('div', { class: 'sg-bar-handle sg-bar-handle--end',   'data-handle': 'end' }));
    }
    if (this.store.selection.has(t.id)) node.classList.add('sg-bar--selected');
    return node;
  }

  _renderBaseline(t, view, range, rowIndex) {
    if (this.baselineValue === 'hidden' || !this.store.baselines.length) return null;
    const baselineId = this.store.activeBaselineId || this.baselineIdValue || this.store.baselines[0]?.id;
    const baseline = this.store.baselines.find((b) => b.id === baselineId);
    if (!baseline) return null;
    const snap = baseline.tasks.find((x) => x.id === t.id);
    if (!snap?.start || !snap?.end) return null;
    const slotStart = view.slotForDate(snap.start, range.start);
    const slotEnd = view.slotForDate(snap.end, range.start);
    const left = slotStart * this.columnWidth;
    const width = Math.max(4, (slotEnd - slotStart) * this.columnWidth);
    const baseEl = el('div', {
      class: `sg-baseline sg-baseline--${this.baselineValue}`,
      'data-task-id': t.id,
    });
    Object.assign(baseEl.style, {
      left: `${left}px`,
      top: `${rowIndex * this.rowHeightValue + (this.baselineValue === 'compare' ? 18 : 0)}px`,
      width: `${width}px`,
      height: `${Math.max(4, this.rowHeightValue / 4)}px`,
    });
    return baseEl;
  }

  _renderArrows(view, range) {
    this._arrowsLayer.replaceChildren();
    if (!this.store.dependencies.length) return;
    const defs = svg('defs');
    const marker = svg('marker', {
      id: 'sg-arrowhead',
      viewBox: '0 0 10 10',
      refX: '8',
      refY: '5',
      markerWidth: '6',
      markerHeight: '6',
      orient: 'auto-start-reverse',
    });
    marker.appendChild(svg('path', { d: 'M 0 0 L 10 5 L 0 10 Z', fill: 'currentColor' }));
    defs.appendChild(marker);
    this._arrowsLayer.appendChild(defs);

    const taskRects = new Map();
    for (const [id, node] of this._taskBarEls?.entries() ?? []) {
      const rect = {
        x: parseFloat(node.style.left) || 0,
        y: parseFloat(node.style.top) || 0,
        width: parseFloat(node.style.width) || 0,
        height: parseFloat(node.style.height) || 0,
      };
      taskRects.set(id, rect);
    }
    const rendererName = this.hasDependencyRendererValue && this.dependencyRendererValue
      ? this.dependencyRendererValue : 'default';
    const renderer = getDependencyRenderer(rendererName) || getDependencyRenderer('default');
    for (const dep of this.store.dependencies) {
      const predRect = taskRects.get(dep.from);
      const succRect = taskRects.get(dep.to);
      if (!predRect || !succRect) continue;
      const anchors = dependencyAnchors(predRect, succRect, dep.type);
      const d = buildArrowPath({ ...anchors, routing: this.dependencyRoutingValue });
      const path = renderer({ d, dep, color: this.dependencyColorValue });
      path.setAttribute('marker-end', 'url(#sg-arrowhead)');
      if (this.store.depSelection.has(dep.id)) path.classList.add('sg-arrow--selected');
      this._arrowsLayer.appendChild(path);
    }
  }

  _renderNowIndicator(view, range) {
    if (!this.nowIndicatorValue) { this._nowLine.hidden = true; return; }
    const now = this._today();
    if (now < range.start || now > range.end) { this._nowLine.hidden = true; return; }
    const slot = view.slotForDate(now, range.start);
    const left = slot * this.columnWidth;
    Object.assign(this._nowLine.style, { left: `${left}px`, height: '100%' });
    this._nowLine.hidden = false;
  }

  _applyCriticalPath() {
    const sched = scheduleProject(this.store);
    for (const [id, node] of (this._taskBarEls?.entries() ?? [])) {
      toggleClass(node, 'sg-bar--critical', sched.criticalTaskIds.has(id));
    }
    this.dispatch('criticalPathRecomputed', {
      detail: { criticalTaskIds: Array.from(sched.criticalTaskIds) },
    });
  }

  _renderSelection() {
    if (!this._taskBarEls) return;
    for (const [id, node] of this._taskBarEls.entries()) {
      toggleClass(node, 'sg-bar--selected', this.store.selection.has(id));
    }
  }

  // -------------------- pointer / DnD --------------------

  _onTimelinePointerDown(e) {
    // Link handle lives in its own layer (sibling of the bars layer)
    // so detect it independently from the bar's interior handles.
    const linkHandleEl = e.target.closest('.sg-link-handle');
    const handle = e.target.closest('[data-handle]');
    const bar = linkHandleEl
      ? this._taskBarEls?.get(linkHandleEl.dataset.taskId) ?? null
      : e.target.closest('[data-task-id]');
    if (!bar) {
      // Click on empty timeline — deselect.
      if (!e.shiftKey && !(e.metaKey || e.ctrlKey)) {
        this.store.selection.clear();
        this._renderSelection();
        this.dispatch('taskSelectionChanged', { detail: { selectedTaskIds: [] } });
      }
      return;
    }
    const taskId = linkHandleEl?.dataset.taskId ?? bar.dataset.taskId;
    const task = this.store.tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (e.button === 0 && !linkHandleEl) {
      this.dispatch('taskClicked', { detail: { taskId, task: taskToWireFormat(task), originalEvent: e } });
    }

    // Selection — skip when grabbing the link handle (the user wants to
    // draw a connector, not select).
    if (!this.suppressTaskClickSelectionValue && !linkHandleEl) {
      if (e.shiftKey && this.taskSelectionValue === 'multiple') {
        const last = this._lastSelected;
        if (last) {
          const i = this.store.tasks.findIndex((t) => t.id === last);
          const j = this.store.tasks.findIndex((t) => t.id === taskId);
          const [lo, hi] = i < j ? [i, j] : [j, i];
          for (let k = lo; k <= hi; k++) this.store.selection.add(this.store.tasks[k].id);
        } else {
          this.store.selection.add(taskId);
        }
      } else if ((e.metaKey || e.ctrlKey || this.taskMultiSelectWithClickValue) && this.taskSelectionValue === 'multiple') {
        if (this.store.selection.has(taskId)) this.store.selection.delete(taskId);
        else this.store.selection.add(taskId);
      } else {
        this.store.selection.clear();
        this.store.selection.add(taskId);
      }
      this._lastSelected = taskId;
      this._renderSelection();
      this.dispatch('taskSelectionChanged', { detail: { selectedTaskIds: Array.from(this.store.selection) } });
    }

    if (!this._isEditable() || task.locked || task.milestone) return;
    if (e.button !== 0) return;

    let mode = 'move';
    if (linkHandleEl) mode = 'link';
    else if (handle?.dataset.handle === 'start') mode = 'resize-start';
    else if (handle?.dataset.handle === 'end') mode = 'resize-end';

    // For link drags, capture on the body so we keep getting move
    // events even when the cursor leaves the source bar — pointer
    // capture on the handle would route every event back to the source
    // and break `elementFromPoint` lookups for drop targets.
    const captureTarget = mode === 'link' ? this._timelineBody : bar;

    this._ensureDragController();
    e.preventDefault();
    this._drag.begin({
      taskId,
      mode,
      originalEvent: e,
      originStart: task.start,
      originEnd: task.end,
      target: captureTarget,
      pointerId: e.pointerId,
    });
  }

  _ensureDragController() {
    if (this._drag) return;
    const view = getView(this.viewName);
    const snapMs = this.hasSnapDurationValue && this.snapDurationValue
      ? Math.max(1, parseDuration(this.snapDurationValue).seconds * 1000 || view.slotMs)
      : view.slotMs;
    this._drag = new DragController({
      element: this._timelineBody,
      columnWidth: this.columnWidth,
      slotMs: view.slotMs,
      snapMs,
      onUpdate: (state) => this._onDragUpdate(state),
      onCommit: (state) => this._onDragCommit(state),
      onCancel: () => this._onDragCancel(),
    });
  }

  _onDragUpdate(state) {
    if (!state) return;
    const bar = this._taskBarEls?.get(state.taskId);
    if (!bar) return;
    const range = this._visibleRangeBoundaries();
    const view = getView(this.viewName);
    if (state.mode === 'link') {
      this._renderLinkRubberBand(state);
      return;
    }
    const slot = view.slotForDate(state.newStart, range.start);
    const slotEnd = view.slotForDate(state.newEnd ?? state.newStart, range.start);
    bar.style.left = `${slot * this.columnWidth}px`;
    bar.style.width = `${Math.max(8, (slotEnd - slot) * this.columnWidth)}px`;
    this._renderTooltip(state);
  }

  _renderLinkRubberBand(state) {
    if (!this._linkPath) {
      this._linkPath = svg('path', { class: 'sg-arrow sg-arrow--rubber', fill: 'none', stroke: 'currentColor' });
      this._arrowsLayer.appendChild(this._linkPath);
    }
    const bar = this._taskBarEls?.get(state.taskId);
    if (!bar) return;
    const fromX = (parseFloat(bar.style.left) || 0) + (parseFloat(bar.style.width) || 0);
    const fromY = (parseFloat(bar.style.top) || 0) + (parseFloat(bar.style.height) || 0) / 2;
    const body = this._timelineBody.getBoundingClientRect();
    const x = state.x - body.left + this._timelineBody.scrollLeft;
    const y = state.y - body.top + this._timelineBody.scrollTop;
    const d = `M ${fromX},${fromY} L ${x},${y}`;
    this._linkPath.setAttribute('d', d);
  }

  _renderTooltip(state) {
    if (!state.newStart) return;
    const bar = this._taskBarEls?.get(state.taskId);
    if (!bar) return;
    this._tooltip.textContent = `${toISODate(state.newStart)} → ${toISODate(state.newEnd ?? state.newStart)}`;
    this._tooltip.style.left = `${parseFloat(bar.style.left)}px`;
    this._tooltip.style.top = `${(parseFloat(bar.style.top) || 0) - 24}px`;
    this._tooltip.hidden = false;
  }

  _onDragCommit(state) {
    if (this._linkPath) { this._linkPath.remove(); this._linkPath = null; }
    this._tooltip.hidden = true;
    if (!state) return;
    const task = this.store.tasks.find((t) => t.id === state.taskId);
    if (!task) return;
    if (state.mode === 'link') {
      // Don't trust originalEvent.target — pointer capture redirects
      // every event back to the capture target. Resolve the drop from
      // the cursor coordinates instead.
      const x = state.originalEvent?.clientX;
      const y = state.originalEvent?.clientY;
      let dropEl = null;
      if (typeof x === 'number' && typeof y === 'number') {
        dropEl = document.elementFromPoint(x, y);
      }
      const target = dropEl?.closest?.('[data-task-id]');
      const targetId = target?.dataset?.taskId;
      if (targetId && targetId !== state.taskId) {
        const before = emit(this.element, 'gantt:beforeDependencyAdd', { from: state.taskId, to: targetId, type: 'FS' });
        if (!before.defaultPrevented) {
          this.store.upsertDependency({ from: state.taskId, to: targetId, type: 'FS' });
          this._publishBroadcast('dependency-add', { dependency: depToWireFormat(this.store.dependencies.at(-1)) });
          this._rerender();
          this.dispatch('dependencyAdded', { detail: { dependencyId: this.store.dependencies.at(-1).id, dependency: depToWireFormat(this.store.dependencies.at(-1)) } });
        }
      }
      return;
    }

    const change = {
      newStart: state.newStart,
      newEnd: state.newEnd ?? state.newStart,
      oldStart: task.start,
      oldEnd: task.end,
      mode: state.mode,
    };
    const beforeEvt = this.dispatch('beforeUpdate', { detail: { taskId: task.id, change }, cancelable: true });
    if (beforeEvt.defaultPrevented) {
      this._rerender();
      return;
    }

    task.start = state.newStart;
    task.end = state.newEnd ?? state.newStart;
    this._publishBroadcast(state.mode === 'resize-start' || state.mode === 'resize-end' ? 'task-update' : 'task-update',
      { task: taskToWireFormat(task) });

    this._rerender();
    if (state.mode === 'move') {
      this.dispatch('taskMoved', {
        detail: {
          taskId: task.id,
          oldStart: change.oldStart, newStart: task.start,
          oldEnd: change.oldEnd, newEnd: task.end,
          delta: state.deltaMs,
        },
      });
    } else {
      this.dispatch('taskResized', {
        detail: {
          taskId: task.id, edge: state.mode === 'resize-start' ? 'start' : 'end',
          oldStart: change.oldStart, oldEnd: change.oldEnd,
          newStart: task.start, newEnd: task.end,
        },
      });
    }
  }

  _onDragCancel() {
    if (this._linkPath) { this._linkPath.remove(); this._linkPath = null; }
    this._tooltip.hidden = true;
    this._rerender();
  }

  _isEditable() {
    return this.editableValue && !this.readOnlyValue;
  }

  _isLinkEditable() {
    if (!this._isEditable()) return false;
    if (this.hasTaskLinkEditableValue) return this.taskLinkEditableValue;
    return this.addDependencyAffordanceValue;
  }

  // -------------------- keyboard --------------------

  _onKeydown(e) {
    if (e.target.closest('input, textarea, [contenteditable]')) return;
    const sel = Array.from(this.store.selection);
    if (e.key === '+' || e.key === '=') { this.zoom(-1); e.preventDefault(); return; }
    if (e.key === '-' || e.key === '_') { this.zoom(+1); e.preventDefault(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.store.depSelection.size) {
        for (const id of Array.from(this.store.depSelection)) {
          const before = this.dispatch('beforeDependencyRemove', { detail: { dependencyId: id }, cancelable: true });
          if (!before.defaultPrevented) this.store.removeDependencyById(id);
        }
        this.store.depSelection.clear();
        this._rerender();
        return;
      }
    }
    if (!sel.length) return;
    const view = getView(this.viewName);
    const snapMs = this.hasSnapDurationValue ? parseDuration(this.snapDurationValue).seconds * 1000 : view.slotMs;
    const arrowDelta = (e.metaKey || e.ctrlKey) ? snapMs : 0;
    if (e.key === 'ArrowLeft' && arrowDelta) {
      this._shiftSelection(-snapMs);
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && arrowDelta) {
      this._shiftSelection(+snapMs);
      e.preventDefault();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      for (const id of sel) {
        if (e.shiftKey) this.element.ganttApi.outdentTask(id);
        else this.element.ganttApi.indentTask(id);
      }
    }
  }

  _shiftSelection(deltaMs) {
    for (const id of this.store.selection) {
      const t = this.store.tasks.find((x) => x.id === id);
      if (!t || t.locked) continue;
      if (t.start) t.start = new Date(t.start.getTime() + deltaMs);
      if (t.end)   t.end = new Date(t.end.getTime() + deltaMs);
    }
    this._rerender();
  }

  // -------------------- persistence --------------------

  _persist() {
    if (!this.hasPersistKeyValue || !this.persistKeyValue) return;
    savePersistedState(this.persistKeyValue, this.serialiseState());
  }

  _restorePersistedState() {
    if (!this.hasPersistKeyValue || !this.persistKeyValue) return;
    const state = loadPersistedState(this.persistKeyValue);
    if (state) this.applyState(state);
  }
}
