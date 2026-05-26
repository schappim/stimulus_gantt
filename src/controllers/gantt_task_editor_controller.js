import { Controller } from '@hotwired/stimulus';

// Inline task editor. Clones the registered `<template id="task-editor">`
// into a popover anchored to the row, seeds inputs from the task and
// reads them back into a `task:update` call on commit.
export default class GanttTaskEditorController extends Controller {
  static values = {
    taskId: String,
    target: String,
  };

  connect() {
    this._chart = this._lookupChart();
  }

  disconnect() {
    this._panel?.remove();
  }

  open(event) {
    const tpl = document.querySelector(this._templateSelector());
    const node = tpl?.content?.firstElementChild?.cloneNode(true);
    if (!node) return;
    if (this._panel) this._panel.remove();
    this._panel = node;
    this._panel.classList.add('sg-task-editor-popover');
    document.body.appendChild(this._panel);
    const task = this._chart.ganttApi.getTaskData().find((t) => t.id === this.taskIdValue);
    if (!task) return;
    for (const input of this._panel.querySelectorAll('[data-editor-field]')) {
      const field = input.dataset.editorField;
      if (task[field] != null) input.value = task[field];
    }
    this._panel.addEventListener('submit', (e) => { e.preventDefault(); this.commit(); });
    this._panel.querySelector('[data-editor-commit]')?.addEventListener('click', () => this.commit());
    this._panel.querySelector('[data-editor-cancel]')?.addEventListener('click', () => this.cancel());
    this._panel.querySelector('[data-editor-input]')?.focus();
    if (event?.target) {
      const rect = event.target.getBoundingClientRect();
      Object.assign(this._panel.style, {
        position: 'absolute',
        left: `${rect.left + window.scrollX}px`,
        top: `${rect.bottom + window.scrollY + 4}px`,
      });
    }
  }

  commit() {
    if (!this._panel || !this._chart) return;
    const update = { id: this.taskIdValue };
    for (const input of this._panel.querySelectorAll('[data-editor-field]')) {
      update[input.dataset.editorField] = input.value;
    }
    this._chart.ganttApi.updateTask(update);
    this._panel.remove();
    this._panel = null;
  }

  cancel() {
    this._panel?.remove();
    this._panel = null;
  }

  _lookupChart() {
    if (this.hasTargetValue) return document.getElementById(this.targetValue);
    return this.element.closest('[data-controller~="gantt"]');
  }

  _templateSelector() {
    const id = this._chart?.dataset?.ganttTaskEditorValue || 'task-editor';
    return `template#${CSS.escape(id)}`;
  }
}
