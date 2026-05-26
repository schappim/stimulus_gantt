import { Controller } from '@hotwired/stimulus';

// Per-sidebar header cell controller. Lets a host hang behaviour like
// "click to sort" or "drag handle to resize column" on individual header
// cells without forking the chart controller. Optional — the main
// controller renders the sidebar by default.
export default class GanttSidebarController extends Controller {
  static values = {
    field: String,
    width: Number,
  };

  connect() {
    if (this.hasFieldValue) this.element.dataset.field = this.fieldValue;
  }

  sort(event) {
    const root = event.target.closest('[data-controller~="gantt"]');
    if (!root?.ganttApi) return;
    const dir = root.ganttApi.getSidebarColumns()
      .find((c) => c.field === this.fieldValue)?.sort === 'asc' ? 'desc' : 'asc';
    root.ganttApi.setSortField(this.fieldValue, dir);
  }
}
