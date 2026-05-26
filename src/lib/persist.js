// LocalStorage persistence. Single key prefix: "sgantt:".

const PREFIX = 'sgantt:';

export function loadPersistedState(key) {
  if (!key || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function savePersistedState(key, state) {
  if (!key || typeof localStorage === 'undefined') return;
  try { localStorage.setItem(PREFIX + key, JSON.stringify(state)); }
  catch { /* quota exceeded — silently drop */ }
}

export function clearPersistedState(key) {
  if (!key || typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
}
