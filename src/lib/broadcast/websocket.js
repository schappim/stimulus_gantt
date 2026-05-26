export function createWebSocketAdapter(url, { protocols } = {}) {
  const ws = new WebSocket(url, protocols);
  let handler = null;
  ws.addEventListener('message', (e) => {
    try { handler?.(JSON.parse(e.data)); } catch { /* ignore non-JSON */ }
  });
  return {
    send(message) {
      const doSend = () => ws.send(JSON.stringify(message));
      if (ws.readyState === WebSocket.OPEN) doSend();
      else ws.addEventListener('open', doSend, { once: true });
    },
    onReceive(fn) { handler = fn; },
    close() { ws.close(); },
  };
}
