// Generic helpers — no DOM access.

export const isArray = Array.isArray;
export const isFunction = (v) => typeof v === 'function';
export const isString = (v) => typeof v === 'string';
export const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
export const isPlainObject = (v) => {
  if (typeof v !== 'object' || v === null) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === null || proto === Object.prototype;
};
export const isDate = (v) => v instanceof Date;

export const noop = () => {};
export const identity = (x) => x;

export function clamp(n, lo, hi) {
  return Math.min(Math.max(n, lo), hi);
}

export function uniq(arr) {
  return [...new Set(arr)];
}

export function debounce(fn, ms) {
  let t = null;
  const wrapped = (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => { t = null; fn(...args); }, ms);
  };
  wrapped.cancel = () => { if (t) clearTimeout(t); t = null; };
  wrapped.flush = (...args) => { if (t) clearTimeout(t); t = null; fn(...args); };
  return wrapped;
}

export function throttleRaf(fn) {
  let scheduled = false;
  let lastArgs = null;
  return (...args) => {
    lastArgs = args;
    if (scheduled) return;
    scheduled = true;
    const raf = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (cb) => setTimeout(cb, 16);
    raf(() => {
      scheduled = false;
      fn(...lastArgs);
    });
  };
}

export function parseJsonAttr(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

export function shallowEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

export function deepClone(value) {
  if (value == null || typeof value !== 'object') return value;
  if (isDate(value)) return new Date(value.getTime());
  if (isArray(value)) return value.map(deepClone);
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = deepClone(v);
  return out;
}
