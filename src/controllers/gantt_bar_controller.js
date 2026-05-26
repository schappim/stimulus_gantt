import { Controller } from '@hotwired/stimulus';

// Per-bar enhancement controller. The main controller already paints the
// bar; this satellite is for hosts that want to attach extra behaviour to
// a specific bar (e.g. tooltip popovers, drag affordances) without forking
// the renderer.
export default class GanttBarController extends Controller {
  static values = { taskId: String };

  connect() {
    if (this.hasTaskIdValue) {
      this.element.dataset.taskId = this.taskIdValue;
    }
  }
}
