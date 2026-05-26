import { Controller } from '@hotwired/stimulus';

// Per-arrow controller. The main controller paints arrows; this satellite
// exists so hosts can hang behaviour on a specific arrow (e.g. open a
// dependency editor on dblclick).
export default class GanttDependencyController extends Controller {
  static values = {
    dependencyId: String,
  };

  connect() {
    if (this.hasDependencyIdValue) {
      this.element.dataset.dependencyId = this.dependencyIdValue;
    }
  }
}
