import { describe, expect, it, beforeEach } from 'vitest';
import { DragController } from '../src/lib/dnd.js';

describe('DragController', () => {
  let captured = [];
  let drag;
  beforeEach(() => {
    captured = [];
    drag = new DragController({
      element: document.createElement('div'),
      columnWidth: 32,
      slotMs: 86_400_000,
      snapMs: 86_400_000,
      onUpdate: (s) => captured.push({ type: 'update', ...s }),
      onCommit: (s) => captured.push({ type: 'commit', ...s }),
      onCancel: (s) => captured.push({ type: 'cancel', ...s }),
    });
  });

  it('programmatic begin → updateProgrammatic → commit', () => {
    drag.beginProgrammatic({
      taskId: 't1',
      mode: 'move',
      originStart: new Date('2026-06-01T00:00:00Z'),
      originEnd: new Date('2026-06-05T00:00:00Z'),
    });
    drag.updateProgrammatic({
      newStart: new Date('2026-06-02T00:00:00Z'),
      newEnd: new Date('2026-06-06T00:00:00Z'),
    });
    drag.commit(null);
    const commit = captured.find((c) => c.type === 'commit');
    expect(commit.taskId).toBe('t1');
    expect(commit.newStart.toISOString().slice(0, 10)).toBe('2026-06-02');
  });

  it('cancel emits cancel callback', () => {
    drag.beginProgrammatic({
      taskId: 't1', mode: 'move',
      originStart: new Date('2026-06-01T00:00:00Z'),
      originEnd: new Date('2026-06-05T00:00:00Z'),
    });
    drag.cancel(null);
    expect(captured.find((c) => c.type === 'cancel')).toBeTruthy();
  });
});
