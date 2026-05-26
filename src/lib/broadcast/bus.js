// BroadcastBus — transport-agnostic core for live multi-user sync.
//
// Adapters implement:
//   { send(message), onReceive(handler), close() }
//
// The bus origin-tags every outbound message so the originator can ignore
// its own echoes when a server fan-out includes the originating client.

const newOrigin = () =>
  (globalThis.crypto?.randomUUID?.()
    ?? `o-${Math.random().toString(36).slice(2)}-${Date.now()}`);

export class BroadcastBus {
  constructor(adapter, { filter } = {}) {
    this.adapter = adapter;
    this.filter = typeof filter === 'function' ? filter : null;
    this.origin = newOrigin();
    this.subscribers = new Set();
    if (adapter && typeof adapter.onReceive === 'function') {
      adapter.onReceive((message) => {
        if (message?.origin === this.origin) return;
        for (const fn of this.subscribers) fn(message);
      });
    }
  }

  publish({ op, payload, meta }) {
    if (this.filter && !this.filter({ op, payload, meta })) return;
    const message = { op, payload, meta, origin: this.origin };
    this.adapter?.send?.(message);
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  close() {
    this.subscribers.clear();
    this.adapter?.close?.();
  }
}
