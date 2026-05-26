// Turbo Streams adapter — registers custom <turbo-stream
// action="gantt-task-*" / "gantt-dependency-*" / "gantt-bulk" handlers
// that fire inbound messages, and emits outbound messages as a
// CustomEvent ('stimulus-gantt:broadcast') that the Rails companion gem
// re-broadcasts over Action Cable.

const HANDLED_ACTIONS = new Set([
  'gantt-task-add',
  'gantt-task-update',
  'gantt-task-remove',
  'gantt-dependency-add',
  'gantt-dependency-remove',
  'gantt-bulk',
  'gantt-conflict',
]);

export function createTurboStreamAdapter() {
  let handler = null;

  function onConnect() {
    document.addEventListener('turbo:before-stream-render', (e) => {
      const stream = e.detail?.newStream;
      const action = stream?.getAttribute('action');
      if (!HANDLED_ACTIONS.has(action)) return;
      e.preventDefault();
      try {
        const payload = JSON.parse(stream.querySelector('template')?.innerHTML || '{}');
        handler?.({ op: action.replace(/^gantt-/, ''), payload });
      } catch { /* ignore malformed payloads */ }
    });
  }

  if (typeof document !== 'undefined') onConnect();

  return {
    send(message) {
      if (typeof document === 'undefined') return;
      document.dispatchEvent(new CustomEvent('stimulus-gantt:broadcast', { detail: message }));
    },
    onReceive(fn) { handler = fn; },
    close() {},
  };
}
