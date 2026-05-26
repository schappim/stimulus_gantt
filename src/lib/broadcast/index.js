// Broadcast adapter resolution.

import { BroadcastBus } from './bus.js';
import { createBroadcastChannelAdapter } from './broadcast_channel.js';
import { createWebSocketAdapter } from './websocket.js';
import { createActionCableAdapter } from './action_cable.js';
import { createTurboStreamAdapter } from './turbo_stream.js';

export { BroadcastBus };

export function resolveAdapter(broadcast, channel, extras = {}) {
  if (!broadcast) return null;
  if (typeof broadcast === 'object' && typeof broadcast.send === 'function') {
    return broadcast;
  }
  switch (broadcast) {
    case 'broadcast-channel':
      return createBroadcastChannelAdapter(channel || 'stimulus-gantt');
    case 'websocket':
      return createWebSocketAdapter(channel, extras);
    case 'action-cable':
      return createActionCableAdapter(extras.consumer, channel);
    case 'turbo-stream':
      return createTurboStreamAdapter();
    default:
      console.warn('[stimulus_gantt] unknown broadcast adapter', broadcast);
      return null;
  }
}
