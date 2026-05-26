import { Controller } from '@hotwired/stimulus';

// Mounts a side rail / popover that re-renders when the user selects a
// different task. Host supplies the `<template id="task-detail-tpl">`
// — this controller just clones and wires bindings.
export default class GanttDetailPanelController extends Controller {
  static values = { target: String };

  connect() {
    this._chart = this._lookupChart();
    if (!this._chart) return;
    this._teardown = this._listen();
  }

  disconnect() { this._teardown?.(); }

  _lookupChart() {
    if (this.hasTargetValue) return document.getElementById(this.targetValue);
    return this.element.closest('[data-controller~="gantt"]');
  }

  _listen() {
    const onSelect = (e) => {
      const ids = e.detail?.selectedTaskIds || [];
      if (!ids.length) { this.element.replaceChildren(); return; }
      const task = this._chart.ganttApi.getTaskData().find((t) => t.id === ids[0]);
      this._render(task);
    };
    this._chart.addEventListener('gantt:taskSelectionChanged', onSelect);
    return () => this._chart.removeEventListener('gantt:taskSelectionChanged', onSelect);
  }

  _render(task) {
    if (!task) return;
    this.element.replaceChildren();
    const tpl = document.getElementById('task-detail-tpl');
    if (tpl) {
      const node = tpl.content.firstElementChild?.cloneNode(true);
      if (node) {
        for (const bound of node.querySelectorAll('[data-bind]')) {
          const f = bound.dataset.bind;
          bound.textContent = task[f] ?? '';
        }
        this.element.appendChild(node);
        return;
      }
    }
    // Fallback rendering.
    const h = document.createElement('h3');
    h.textContent = task.name;
    this.element.appendChild(h);
    const meta = document.createElement('p');
    meta.textContent = `${task.start ?? ''} → ${task.end ?? ''}`;
    this.element.appendChild(meta);
  }
}
