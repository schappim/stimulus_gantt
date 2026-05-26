import { describe, expect, it } from 'vitest';
import { BroadcastBus } from '../src/lib/broadcast/bus.js';

function memoryAdapter() {
  let h = null;
  return {
    sent: [],
    send(message) { this.sent.push(message); },
    onReceive(fn) { h = fn; },
    deliver(msg) { h?.(msg); },
    close() {},
  };
}

describe('BroadcastBus', () => {
  it('tags every outbound with origin', () => {
    const adapter = memoryAdapter();
    const bus = new BroadcastBus(adapter);
    bus.publish({ op: 'task-update', payload: { task: { id: '1' } } });
    expect(adapter.sent[0].origin).toBe(bus.origin);
  });

  it('drops echoes that share its origin', () => {
    const adapter = memoryAdapter();
    const bus = new BroadcastBus(adapter);
    let received = 0;
    bus.subscribe(() => received++);
    adapter.deliver({ op: 'task-update', origin: bus.origin });
    adapter.deliver({ op: 'task-update', origin: 'other-origin' });
    expect(received).toBe(1);
  });

  it('runs filter before publishing', () => {
    const adapter = memoryAdapter();
    const bus = new BroadcastBus(adapter, { filter: ({ op }) => op !== 'task-remove' });
    bus.publish({ op: 'task-remove', payload: { taskId: '1' } });
    bus.publish({ op: 'task-update', payload: { task: { id: '1' } } });
    expect(adapter.sent.length).toBe(1);
    expect(adapter.sent[0].op).toBe('task-update');
  });
});
