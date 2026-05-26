import { describe, expect, it, beforeEach } from 'vitest';
import { Application } from '@hotwired/stimulus';
import GanttController from '../src/controllers/gantt_controller.js';

let app;
async function mount(html) {
  document.body.innerHTML = html;
  if (app) app.stop();
  app = Application.start();
  app.register('gantt', GanttController);
  // wait two microtasks for connect()
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
  return document.querySelector('[data-controller="gantt"]');
}

describe('ganttApi', () => {
  it('exposes after gantt:ready', async () => {
    const el = await mount(`
      <div data-controller="gantt" data-gantt-view-value="week" style="height: 400px">
        <ol class="sg-tasks">
          <li data-task-id="1" data-task-name="Design" data-task-start="2026-06-01" data-task-end="2026-06-05"></li>
          <li data-task-id="2" data-task-name="Build" data-task-start="2026-06-08" data-task-end="2026-06-19"></li>
        </ol>
      </div>
    `);
    expect(el.ganttApi).toBeTruthy();
    expect(el.ganttApi.getTaskData().length).toBe(2);
  });

  it('setTaskData triggers visible bars', async () => {
    const el = await mount(`<div data-controller="gantt" style="height: 400px"></div>`);
    el.ganttApi.setTaskData([
      { id: 't1', name: 'Test', start: '2026-06-01', end: '2026-06-05' },
    ]);
    expect(el.ganttApi.getTaskData().length).toBe(1);
  });

  it('addDependency emits gantt:dependencyAdded', async () => {
    const el = await mount(`<div data-controller="gantt" style="height: 400px"></div>`);
    el.ganttApi.setTaskData([
      { id: '1', name: 'A', start: '2026-06-01', end: '2026-06-05' },
      { id: '2', name: 'B', start: '2026-06-05', end: '2026-06-10' },
    ]);
    let fired = null;
    el.addEventListener('gantt:dependencyAdded', (e) => { fired = e.detail; });
    el.ganttApi.addDependency({ id: 'd1', from: '1', to: '2', type: 'FS' });
    expect(fired).toBeTruthy();
    expect(fired.dependency.from).toBe('1');
  });

  it('captureBaseline stores snapshot', async () => {
    const el = await mount(`<div data-controller="gantt" style="height: 400px"></div>`);
    el.ganttApi.setTaskData([
      { id: '1', name: 'A', start: '2026-06-01', end: '2026-06-05' },
    ]);
    const id = el.ganttApi.captureBaseline({ id: 'b1', name: 'Kickoff' });
    expect(id).toBe('b1');
    expect(el.ganttApi.getBaselineData().length).toBe(1);
  });

  it('setCriticalPath fires criticalPathRecomputed', async () => {
    const el = await mount(`<div data-controller="gantt" style="height: 400px"></div>`);
    el.ganttApi.setTaskData([
      { id: '1', start: '2026-06-01', end: '2026-06-05' },
      { id: '2', start: '2026-06-05', end: '2026-06-10' },
    ]);
    el.ganttApi.addDependency({ from: '1', to: '2', type: 'FS' });
    let fired = null;
    el.addEventListener('gantt:criticalPathRecomputed', (e) => { fired = e.detail; });
    el.ganttApi.setCriticalPath(true);
    expect(fired.criticalTaskIds.length).toBeGreaterThan(0);
  });
});

describe('HTML-first contract', () => {
  it('parses nested <ol> into summary + children', async () => {
    const el = await mount(`
      <div data-controller="gantt" style="height: 400px">
        <ol class="sg-tasks">
          <li data-task-id="1" data-task-name="Parent">
            <ol>
              <li data-task-id="2" data-task-name="Child" data-task-start="2026-06-01" data-task-end="2026-06-05"></li>
            </ol>
          </li>
        </ol>
      </div>
    `);
    const tasks = el.ganttApi.getTaskData();
    expect(tasks.length).toBe(2);
    const parent = tasks.find((t) => t.id === '1');
    expect(parent.summary).toBe(true);
  });
});
