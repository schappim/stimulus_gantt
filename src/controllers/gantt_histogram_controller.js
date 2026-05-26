import { Controller } from '@hotwired/stimulus';

import { startOfDay, addDays } from '../lib/date.js';

// Resource histogram panel. Listens for tasks / resources changes on the
// chart element and renders one bar row per resource showing allocation
// per day.
export default class GanttHistogramController extends Controller {
  static values = { target: String };

  connect() {
    this._chart = this._lookupChart();
    if (!this._chart) return;
    this._teardown = this._listenForChartChanges();
    this._render();
  }

  disconnect() { this._teardown?.(); }

  _lookupChart() {
    if (this.hasTargetValue) {
      return document.getElementById(this.targetValue);
    }
    return this.element.closest('[data-controller~="gantt"]');
  }

  _listenForChartChanges() {
    const re = () => this._render();
    const events = ['gantt:taskDataChanged', 'gantt:resourceDataChanged', 'gantt:taskMoved', 'gantt:taskResized'];
    events.forEach((evt) => this._chart.addEventListener(evt, re));
    return () => events.forEach((evt) => this._chart.removeEventListener(evt, re));
  }

  _render() {
    const api = this._chart?.ganttApi;
    if (!api) return;
    const tasks = api.getTaskData();
    const resources = api.getResourceData();
    const root = this.element;
    root.replaceChildren();
    root.classList.add('sg-histogram');

    let rangeStart = null;
    let rangeEnd = null;
    for (const t of tasks) {
      const s = t.start ? new Date(t.start) : null;
      const e = t.end ? new Date(t.end) : s;
      if (s && (!rangeStart || s < rangeStart)) rangeStart = s;
      if (e && (!rangeEnd || e > rangeEnd)) rangeEnd = e;
    }
    if (!rangeStart || !rangeEnd) return;
    const days = [];
    let cur = startOfDay(rangeStart);
    while (cur < rangeEnd) {
      days.push(cur);
      cur = addDays(cur, 1);
      if (days.length > 365) break;
    }
    for (const r of resources) {
      const row = document.createElement('div');
      row.className = 'sg-histogram-row';
      const label = document.createElement('div');
      label.className = 'sg-histogram-label';
      label.textContent = r.name;
      row.appendChild(label);
      const bars = document.createElement('div');
      bars.className = 'sg-histogram-bars';
      for (const day of days) {
        const cell = document.createElement('div');
        cell.className = 'sg-histogram-cell';
        let units = 0;
        for (const t of tasks) {
          if (!t.resourceIds?.includes(r.id)) continue;
          const s = t.start ? new Date(t.start) : null;
          const e = t.end ? new Date(t.end) : s;
          if (s && e && day >= startOfDay(s) && day < e) units += 1;
        }
        const ratio = Math.min(1, units / Math.max(0.0001, r.capacity ?? 1));
        cell.style.background = ratio > 1 ? 'crimson' : `rgba(59, 130, 246, ${ratio})`;
        cell.title = `${r.name}: ${units}/${r.capacity ?? 1}`;
        if (units > (r.capacity ?? 1)) {
          this._chart.dispatchEvent(new CustomEvent('gantt:overallocationDetected', {
            detail: { resourceId: r.id, intervals: [{ start: day, end: addDays(day, 1), units }] },
            bubbles: true,
          }));
        }
        bars.appendChild(cell);
      }
      row.appendChild(bars);
      root.appendChild(row);
    }
  }
}
