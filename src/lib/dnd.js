// Pointer drag state machine for the timeline. Three modes:
//   "move"          – translate the bar (start AND end together)
//   "resize-start"  – move only the start handle
//   "resize-end"    – move only the end handle
//   "link"          – emit a dependency-create gesture; the host wires
//                     up the visual rubber-band line.
//
// The state machine is intentionally tiny and renderer-agnostic; the
// controller owns the bar DOM and the overlay. We only emit logical
// callbacks (`onUpdate(state)`, `onCommit(state)`, `onCancel()`).

import { listen } from './dom.js';

export const MODES = ['move', 'resize-start', 'resize-end', 'link'];

export class DragController {
  constructor({
    element,           // chart content scroller (the element with the bars)
    columnWidth,       // pixel width per slot
    slotMs,            // milliseconds per slot
    snapMs,            // ms snap resolution (defaults to slotMs)
    onUpdate,          // ({ taskId, mode, deltaMs, newStart, newEnd, x, y, hovered }) => void
    onCommit,          // ({ taskId, mode, deltaMs, newStart, newEnd, originalEvent }) => void
    onCancel,          // () => void
    autoScrollEdgeMs = 16,
    autoScrollSpeed = 12,
  }) {
    this.element = element;
    this.columnWidth = columnWidth;
    this.slotMs = slotMs;
    this.snapMs = snapMs ?? slotMs;
    this.onUpdate = onUpdate || (() => {});
    this.onCommit = onCommit || (() => {});
    this.onCancel = onCancel || (() => {});
    this.active = null;       // current drag state
    this.teardowns = [];
    this.autoScrollEdgeMs = autoScrollEdgeMs;
    this.autoScrollSpeed = autoScrollSpeed;
    this._autoScrollRaf = null;
  }

  destroy() {
    this._endListeners();
    this._stopAutoScroll();
  }

  begin({ taskId, mode, originalEvent, originStart, originEnd, target, pointerId }) {
    if (this.active) this.cancel(originalEvent);
    if (!MODES.includes(mode)) throw new Error(`unknown drag mode ${mode}`);
    if (target?.setPointerCapture && pointerId != null) {
      try { target.setPointerCapture(pointerId); } catch { /* ignore */ }
    }
    const px = originalEvent?.clientX ?? 0;
    const py = originalEvent?.clientY ?? 0;
    this.active = {
      taskId,
      mode,
      startX: px,
      startY: py,
      lastX: px,
      lastY: py,
      originStart,
      originEnd,
      newStart: originStart,
      newEnd: originEnd,
      deltaMs: 0,
      target,
      pointerId,
    };
    this._installListeners();
    this._emitUpdate(originalEvent);
  }

  // Programmatic begin/end for tests and the public API. The host can
  // skip pointer events entirely and drive begin → commit directly.
  beginProgrammatic({ taskId, mode, originStart, originEnd }) {
    this.active = {
      taskId,
      mode,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      originStart,
      originEnd,
      newStart: originStart,
      newEnd: originEnd,
      deltaMs: 0,
      target: null,
      pointerId: null,
      programmatic: true,
    };
  }

  updateProgrammatic({ newStart, newEnd }) {
    if (!this.active) return;
    this.active.newStart = newStart;
    this.active.newEnd = newEnd;
    this.active.deltaMs = newStart && this.active.originStart
      ? newStart.getTime() - this.active.originStart.getTime()
      : 0;
    this.onUpdate(this.snapshot());
  }

  commit(originalEvent) {
    if (!this.active) return;
    this.onCommit({ ...this.snapshot(), originalEvent });
    this._cleanup();
  }

  cancel(originalEvent) {
    if (!this.active) return;
    this.onCancel({ ...this.snapshot(), originalEvent });
    this._cleanup();
  }

  snapshot() {
    if (!this.active) return null;
    return {
      taskId: this.active.taskId,
      mode: this.active.mode,
      deltaMs: this.active.deltaMs,
      newStart: this.active.newStart,
      newEnd: this.active.newEnd,
    };
  }

  // ---------- internals ----------

  _installListeners() {
    this.teardowns.push(listen(window, 'pointermove', (e) => this._onMove(e)));
    this.teardowns.push(listen(window, 'pointerup', (e) => this.commit(e)));
    this.teardowns.push(listen(window, 'pointercancel', (e) => this.cancel(e)));
    this.teardowns.push(listen(window, 'keydown', (e) => {
      if (e.key === 'Escape') this.cancel(e);
    }));
  }

  _endListeners() {
    for (const t of this.teardowns) t();
    this.teardowns = [];
  }

  _cleanup() {
    if (this.active?.target?.releasePointerCapture && this.active.pointerId != null) {
      try { this.active.target.releasePointerCapture(this.active.pointerId); } catch { /* ignore */ }
    }
    this.active = null;
    this._endListeners();
    this._stopAutoScroll();
  }

  _onMove(e) {
    if (!this.active) return;
    const dx = e.clientX - this.active.startX;
    const slot = this.snapMs / this.slotMs;
    let slots = dx / this.columnWidth;
    slots = Math.round(slots / slot) * slot;
    const deltaMs = Math.round(slots * this.slotMs);
    this.active.deltaMs = deltaMs;
    this.active.lastX = e.clientX;
    this.active.lastY = e.clientY;
    if (this.active.mode === 'move') {
      this.active.newStart = new Date(this.active.originStart.getTime() + deltaMs);
      this.active.newEnd = this.active.originEnd
        ? new Date(this.active.originEnd.getTime() + deltaMs)
        : this.active.newStart;
    } else if (this.active.mode === 'resize-start') {
      const ns = new Date(this.active.originStart.getTime() + deltaMs);
      if (!this.active.originEnd || ns < this.active.originEnd) {
        this.active.newStart = ns;
        this.active.newEnd = this.active.originEnd;
      }
    } else if (this.active.mode === 'resize-end') {
      const ne = new Date((this.active.originEnd ?? this.active.originStart).getTime() + deltaMs);
      if (ne > this.active.newStart) {
        this.active.newEnd = ne;
      }
    } else if (this.active.mode === 'link') {
      // No date change for link; the host paints a rubber-band.
      this.active.newStart = this.active.originStart;
      this.active.newEnd = this.active.originEnd;
    }
    this._emitUpdate(e);
    this._maybeAutoScroll(e);
  }

  _emitUpdate(e) {
    this.onUpdate({
      ...this.snapshot(),
      x: e?.clientX ?? this.active?.lastX ?? 0,
      y: e?.clientY ?? this.active?.lastY ?? 0,
      hovered: e?.target ?? null,
      originalEvent: e,
    });
  }

  _maybeAutoScroll(e) {
    if (!this.element) return;
    const rect = this.element.getBoundingClientRect();
    const edge = 24;
    let dx = 0;
    let dy = 0;
    if (e.clientX > rect.right - edge) dx = this.autoScrollSpeed;
    else if (e.clientX < rect.left + edge) dx = -this.autoScrollSpeed;
    if (e.clientY > rect.bottom - edge) dy = this.autoScrollSpeed;
    else if (e.clientY < rect.top + edge) dy = -this.autoScrollSpeed;
    if (dx === 0 && dy === 0) {
      this._stopAutoScroll();
      return;
    }
    if (!this._autoScrollRaf) {
      const tick = () => {
        if (!this.active) { this._autoScrollRaf = null; return; }
        this.element.scrollLeft += dx;
        this.element.scrollTop += dy;
        this._autoScrollRaf = requestAnimationFrame(tick);
      };
      this._autoScrollRaf = requestAnimationFrame(tick);
    }
  }

  _stopAutoScroll() {
    if (this._autoScrollRaf) {
      cancelAnimationFrame(this._autoScrollRaf);
      this._autoScrollRaf = null;
    }
  }
}
