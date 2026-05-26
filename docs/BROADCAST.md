# Live broadcasting

`stimulus_gantt` ships a transport-agnostic broadcast bus. Adapters
ship for four common Rails / Hotwire transports plus tab-to-tab sync.

## Quick start

```html
<div data-controller="gantt"
     data-gantt-broadcast-value="broadcast-channel"
     data-gantt-broadcast-channel-value="my-project">
  …
</div>
```

Open two tabs on the page; drag in one tab, watch the other.

## Adapters

| `data-gantt-broadcast-value` | When to use |
|---|---|
| `"broadcast-channel"` | Tab-to-tab sync inside one browser. No server. |
| `"websocket"` | Raw WebSocket, server format defined by your app. |
| `"action-cable"` | Direct Action Cable subscription. |
| `"turbo-stream"` | Rails companion fan-out via `<turbo-stream>` actions. |

## Message shape

```js
{
  op:        'task-update'   // | 'task-add' | 'task-remove'
                              // | 'dependency-add' | 'dependency-remove'
                              // | 'bulk' | 'conflict'
  payload:   { ... },         // op-specific
  meta:      { user?, ... },  // adapter-specific
  origin:    'origin-uuid'    // set by the bus
}
```

`origin` is set per-bus and echo-suppressed automatically.

## Outbound hook

Every outbound publish fires a `gantt:broadcast:out` CustomEvent on the
chart element BEFORE the adapter sees it. Hosts can inspect, mutate, or
cancel a message via `event.preventDefault()`.

```js
chart.addEventListener('gantt:broadcast:out', (e) => {
  const { message } = e.detail;
  if (message.op === 'task-remove') e.preventDefault();
});
```

## Inbound hook

`gantt:broadcast:in` fires for every message that survives echo
suppression. The bus has already applied the change to the store by the
time the event fires — handlers run for side-effects, not gating.

## Filter

```html
<div data-controller="gantt"
     data-gantt-broadcast-value="action-cable"
     data-gantt-broadcast-filter-value="…">
  …
</div>
```

For dynamic filters use the JS API:

```js
import { BroadcastBus, resolveAdapter } from '@ninjaai/stimulus_gantt';
const adapter = resolveAdapter('broadcast-channel', 'demo');
const bus = new BroadcastBus(adapter, {
  filter: ({ op, payload }) => !payload?.task?.confidential,
});
```

## Custom Turbo Stream actions

The Rails companion gem fans out:

| Action | Payload (template body, JSON) |
|---|---|
| `gantt-task-add` | `{ task }` |
| `gantt-task-update` | `{ task }` |
| `gantt-task-remove` | `{ taskId }` |
| `gantt-dependency-add` | `{ dependency }` |
| `gantt-dependency-remove` | `{ dependencyId }` |
| `gantt-bulk` | `{ add?, update?, remove? }` |
| `gantt-conflict` | `{ taskId, reason, attempted }` |

The `turbo-stream` adapter listens for `turbo:before-stream-render`,
intercepts these actions, and pumps them into the bus.

## Conflict resolution

Default: **last-write-wins by task id**. Override:

```js
import { BroadcastBus, resolveAdapter } from '@ninjaai/stimulus_gantt';

window.ganttBroadcastResolve = ({ local, incoming }) => {
  // Always prefer the server's timestamp.
  return incoming.meta?.serverTime > local.meta?.serverTime ? incoming : local;
};
```
