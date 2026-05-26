// Public ganttApi factory — surfaces everything documented in
// REQUIREMENTS.md §8 on a single object.

import {
  taskToWireFormat, depToWireFormat, baselineToWireFormat,
  normalizeTask, normalizeDependency, buildTaskIndex,
} from './model.js';
import { exportJson, exportCsv, exportMsProjectXml, importMsProjectXml } from './export.js';
import { scheduleProject, computeTaskSlack } from './schedule.js';
import { toISO } from './date.js';

export function createGanttApi(controller) {
  const store = controller.store;

  function recompute() { controller.rerender(); }

  function fire(name, detail) {
    return controller.dispatch(name, { detail });
  }

  return {
    // --- Data
    setTaskData(tasks) {
      store.setTasks(tasks);
      recompute();
      fire('taskDataChanged', { tasks: store.tasks.map(taskToWireFormat) });
    },
    getTaskData() { return store.tasks.map(taskToWireFormat); },
    setDependencyData(deps) {
      store.setDependencies(deps);
      recompute();
      fire('dependencyDataChanged', { dependencies: store.dependencies.map(depToWireFormat) });
    },
    getDependencyData() { return store.dependencies.map(depToWireFormat); },
    setResourceData(rs) {
      store.setResources(rs);
      recompute();
      fire('resourceDataChanged', { resources: store.resources });
    },
    getResourceData() { return store.resources.map((r) => ({ ...r })); },
    setBaselineData(bs) { store.setBaselines(bs); recompute(); },
    getBaselineData() { return store.baselines.map(baselineToWireFormat); },
    applyTransaction(tx) {
      store.applyTransaction(tx);
      recompute();
    },

    // --- Per-row mutation
    addTask(task, opts) {
      const norm = normalizeTask({ ...task });
      if (!norm) return null;
      if (opts?.parentId) norm.parentId = String(opts.parentId);
      store.upsertTask(norm);
      recompute();
      fire('taskAdded', { taskId: norm.id, task: taskToWireFormat(norm) });
      return norm.id;
    },
    updateTask(task) {
      const norm = normalizeTask(task);
      if (!norm) return null;
      const prev = store.tasks.find((t) => t.id === norm.id);
      store.upsertTask(norm);
      recompute();
      return prev;
    },
    removeTaskById(id) {
      const removed = store.tasks.find((t) => t.id === String(id));
      const ok = store.removeTaskById(id);
      if (ok) {
        recompute();
        fire('taskRemoved', { taskId: String(id), task: removed ? taskToWireFormat(removed) : null });
      }
      return ok;
    },
    addDependency(dep) {
      const norm = normalizeDependency(dep);
      if (!norm) return null;
      store.upsertDependency(norm);
      recompute();
      fire('dependencyAdded', { dependencyId: norm.id, dependency: depToWireFormat(norm) });
      return norm.id;
    },
    removeDependencyById(id) {
      const dep = store.dependencies.find((d) => d.id === String(id));
      const ok = store.removeDependencyById(id);
      if (ok) {
        recompute();
        fire('dependencyRemoved', { dependencyId: String(id), dependency: dep ? depToWireFormat(dep) : null });
      }
      return ok;
    },
    moveTask(id, { parentId, toIndex } = {}) {
      const t = store.tasks.find((x) => x.id === String(id));
      if (!t) return false;
      if (parentId !== undefined) t.parentId = parentId != null ? String(parentId) : null;
      if (toIndex != null) {
        store.tasks = store.tasks.filter((x) => x.id !== t.id);
        store.tasks.splice(toIndex, 0, t);
      }
      recompute();
      fire('taskReparented', { taskId: t.id, toParentId: t.parentId, toIndex });
      return true;
    },
    indentTask(id) {
      const idx = store.tasks.findIndex((t) => t.id === String(id));
      if (idx <= 0) return false;
      const prev = store.tasks[idx - 1];
      store.tasks[idx].parentId = prev.id;
      prev.summary = true;
      recompute();
      return true;
    },
    outdentTask(id) {
      const t = store.tasks.find((x) => x.id === String(id));
      if (!t || !t.parentId) return false;
      const parent = store.tasks.find((x) => x.id === t.parentId);
      t.parentId = parent?.parentId ?? null;
      recompute();
      return true;
    },

    // --- Scheduling
    reschedule(id, { start, end, duration } = {}) {
      const t = store.tasks.find((x) => x.id === String(id));
      if (!t) return false;
      if (start) t.start = new Date(start);
      if (end) t.end = new Date(end);
      if (duration) t.durationRaw = duration;
      recompute();
      return true;
    },
    scheduleProject() { return scheduleProject(store); },
    setTaskProgress(id, value) {
      const t = store.tasks.find((x) => x.id === String(id));
      if (!t) return false;
      const oldValue = t.progress;
      t.progress = Math.max(0, Math.min(1, Number(value)));
      recompute();
      fire('taskProgressChanged', { taskId: t.id, oldValue, newValue: t.progress });
      return true;
    },
    setTaskConstraint(id, { type, date } = {}) {
      const t = store.tasks.find((x) => x.id === String(id));
      if (!t) return false;
      t.constraintType = type ?? null;
      t.constraintDate = date ? new Date(date) : null;
      recompute();
      return true;
    },

    // --- Selection
    getSelectedTaskIds() { return Array.from(store.selection); },
    getSelectedTasks() {
      return Array.from(store.selection).map((id) =>
        store.tasks.find((t) => t.id === id)).filter(Boolean).map(taskToWireFormat);
    },
    selectTask(id) {
      store.selection.add(String(id));
      controller.refreshSelection();
      fire('taskSelectionChanged', { selectedTaskIds: Array.from(store.selection) });
    },
    deselectTask(id) {
      store.selection.delete(String(id));
      controller.refreshSelection();
      fire('taskSelectionChanged', { selectedTaskIds: Array.from(store.selection) });
    },
    selectRange(fromId, toId) {
      const i = store.tasks.findIndex((t) => t.id === String(fromId));
      const j = store.tasks.findIndex((t) => t.id === String(toId));
      if (i === -1 || j === -1) return;
      const [lo, hi] = i < j ? [i, j] : [j, i];
      for (let k = lo; k <= hi; k++) store.selection.add(store.tasks[k].id);
      controller.refreshSelection();
      fire('taskSelectionChanged', { selectedTaskIds: Array.from(store.selection) });
    },
    clearSelection() {
      store.selection.clear();
      store.depSelection.clear();
      controller.refreshSelection();
      fire('taskSelectionChanged', { selectedTaskIds: [] });
    },
    getSelectedDependencyIds() { return Array.from(store.depSelection); },

    // --- View / zoom
    setView(view) {
      controller.setView(view);
    },
    getView() { return controller.viewName; },
    zoomIn() { controller.zoom(+1); },
    zoomOut() { controller.zoom(-1); },
    zoomTo(view) { controller.setView(view); },
    setColumnWidth(px) {
      controller.columnWidth = px;
      recompute();
      fire('viewChanged', { view: controller.viewName, columnWidth: controller.columnWidth });
    },
    fitProject() { controller.fitProject(); },
    scrollToTask(id) { controller.scrollToTask(String(id)); },
    scrollToDate(date) { controller.scrollToDate(new Date(date)); },
    getVisibleRange() { return controller.getVisibleRange(); },

    // --- Sidebar
    setSidebarColumns(cols) { controller.setSidebarColumns(cols); recompute(); },
    getSidebarColumns() { return controller.sidebarColumns.slice(); },
    setSidebarWidth(px) { controller.setSidebarWidth(px); },
    setSidebarCollapsed(bool) { controller.setSidebarCollapsed(bool); },
    setColumnVisible(field, bool) {
      const col = controller.sidebarColumns.find((c) => c.field === field);
      if (col) { col.hidden = !bool; recompute(); }
    },
    moveColumn(field, toIndex) {
      const idx = controller.sidebarColumns.findIndex((c) => c.field === field);
      if (idx < 0) return;
      const [col] = controller.sidebarColumns.splice(idx, 1);
      controller.sidebarColumns.splice(toIndex, 0, col);
      recompute();
    },
    setSortField(field, dir = 'asc') {
      controller.sortField = field;
      controller.sortDirection = dir;
      recompute();
    },
    setGroupBy(field) {
      controller.groupBy = field || null;
      recompute();
      fire('groupChanged', { groupBy: controller.groupBy });
    },
    getGroupBy() { return controller.groupBy; },

    // --- Tree
    expandTask(id) { store.collapsed.delete(String(id)); recompute(); },
    collapseTask(id) { store.collapsed.add(String(id)); recompute(); },
    expandAll() { store.collapsed.clear(); recompute(); },
    collapseAll() {
      for (const t of store.tasks) if (t.summary) store.collapsed.add(t.id);
      recompute();
    },
    expandToLevel(n) {
      const idx = buildTaskIndex(store.tasks);
      store.collapsed.clear();
      for (const id of idx.order) {
        const t = idx.byId.get(id);
        if (t.summary && (t.depth ?? 0) >= n) store.collapsed.add(id);
      }
      recompute();
    },

    // --- Critical path
    setCriticalPath(bool) {
      controller.criticalPath = !!bool;
      recompute();
      const ids = Array.from(scheduleProject(store).criticalTaskIds);
      fire('criticalPathRecomputed', { criticalTaskIds: ids });
    },
    getCriticalPathIds() {
      return Array.from(scheduleProject(store).criticalTaskIds);
    },
    getTaskSlack(id) { return computeTaskSlack(id, store); },

    // --- Baselines
    captureBaseline({ id, name } = {}) {
      const baseline = {
        id: id ?? `baseline-${Date.now()}`,
        name: name ?? 'Baseline',
        capturedAt: new Date(),
        tasks: store.tasks.map((t) => ({
          id: t.id, start: t.start, end: t.end, progress: t.progress,
        })),
      };
      store.baselines.push(baseline);
      recompute();
      fire('baselineCaptured', { baselineId: baseline.id, name: baseline.name });
      return baseline.id;
    },
    setActiveBaseline(id) {
      store.activeBaselineId = id ? String(id) : null;
      recompute();
    },
    clearBaseline(id) {
      store.baselines = store.baselines.filter((b) => b.id !== String(id));
      recompute();
    },

    // --- Filter & search
    setQuickFilter(q) {
      controller.quickFilter = q || '';
      recompute();
      fire('filterChanged', { quickFilter: controller.quickFilter, predicate: controller.taskFilter });
    },
    getQuickFilter() { return controller.quickFilter; },
    setTaskFilter(predicate) {
      controller.taskFilter = predicate;
      recompute();
      fire('filterChanged', { quickFilter: controller.quickFilter, predicate });
    },
    getTaskFilter() { return controller.taskFilter; },

    // --- Hit testing
    taskFromPoint(x, y) { return controller.taskFromPoint(x, y); },
    dateFromPoint(x, y) { return controller.dateFromPoint(x, y); },
    rowFromPoint(x, y) { return controller.rowFromPoint(x, y); },

    // --- Drag programmatic
    beginDragTask(id, { mode } = {}) { return controller.beginDragTask(id, mode); },
    endDrag(opts = {}) { return controller.endDrag(opts); },

    // --- Persistence
    getGanttState() { return controller.serialiseState(); },
    applyGanttState(state) { controller.applyState(state); recompute(); },
    clearPersistedState() { controller.clearPersistedState(); },

    // --- Export
    getDataAsJson() { return exportJson(store); },
    getDataAsCsv(opts = {}) { return exportCsv(store, opts); },
    getDataAsMsProjectXml() { return exportMsProjectXml(store); },
    setTaskDataFromMsProjectXml(xml) {
      const { tasks, dependencies } = importMsProjectXml(xml);
      store.setTasks(tasks);
      store.setDependencies(dependencies);
      recompute();
    },
    printToPdf() {
      if (typeof window !== 'undefined' && window.print) window.print();
    },
    exportImage() {
      // SVG snapshot of the chart content — captured by serialising
      // controller.elementForSnapshot().outerHTML. Hosts in tests can
      // stub this.
      return controller.exportImage();
    },

    // --- Detail panel
    openTaskDetail(id) { controller.openTaskDetail(String(id)); },
    closeTaskDetail() { controller.closeTaskDetail(); },
  };
}
