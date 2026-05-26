import { Controller } from '@hotwired/stimulus';

// Toolbar controller. Renders prev/next/zoom/view buttons and wires them
// to the host chart's ganttApi. Mount inside the chart element OR pass
// `data-gantt-toolbar-target-value="<id>"` to drive an external toolbar.
export default class GanttToolbarController extends Controller {
  static values = {
    target: String,
    views: { type: Array, default: ['hour', 'day', 'week', 'month', 'quarter', 'year'] },
  };

  connect() {
    this._render();
  }

  _api() {
    if (this.hasTargetValue) {
      return document.getElementById(this.targetValue)?.ganttApi ?? null;
    }
    const chart = this.element.closest('[data-controller~="gantt"]');
    return chart?.ganttApi ?? null;
  }

  _render() {
    this.element.classList.add('sg-toolbar-managed');
    this.element.replaceChildren();
    const mkBtn = (label, action, attrs = {}) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.className = 'sg-tb-btn';
      b.addEventListener('click', () => this[action]?.());
      Object.entries(attrs).forEach(([k, v]) => b.setAttribute(k, v));
      return b;
    };
    this.element.appendChild(mkBtn('−', 'zoomOut', { 'aria-label': 'Zoom out' }));
    this.element.appendChild(mkBtn('+', 'zoomIn', { 'aria-label': 'Zoom in' }));
    this.element.appendChild(mkBtn('Fit', 'fit'));
    for (const v of this.viewsValue) {
      const b = mkBtn(v, '_noop');
      b.addEventListener('click', () => this._api()?.setView(v));
      b.dataset.view = v;
      this.element.appendChild(b);
    }
    const filter = document.createElement('input');
    filter.type = 'search';
    filter.className = 'sg-tb-filter';
    filter.placeholder = 'Filter tasks…';
    filter.addEventListener('input', (e) => this._api()?.setQuickFilter(e.target.value));
    this.element.appendChild(filter);
  }

  zoomIn() { this._api()?.zoomIn(); }
  zoomOut() { this._api()?.zoomOut(); }
  fit() { this._api()?.fitProject(); }
  _noop() { /* placeholder */ }
}
