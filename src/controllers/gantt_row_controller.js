import { Controller } from '@hotwired/stimulus';

// Per-row controller. Used by hosts that need a hook on each WBS row
// (e.g. context menus, drag-to-reorder handles).
export default class GanttRowController extends Controller {
  static values = { taskId: String };

  connect() {
    if (this.hasTaskIdValue) this.element.dataset.taskId = this.taskIdValue;
  }
}
