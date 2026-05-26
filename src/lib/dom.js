// DOM helpers used across controllers, renderers and DnD.

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  applyAttrs(node, attrs);
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number'
      ? document.createTextNode(String(c)) : c);
  }
  return node;
}

export function svg(tag, attrs = {}, children = []) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, String(v));
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.appendChild(c);
  }
  return node;
}

export function applyAttrs(node, attrs) {
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) {
      node.removeAttribute(k);
      continue;
    }
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, String(v));
  }
}

export function emit(target, name, detail, opts = {}) {
  const event = new CustomEvent(name, {
    detail,
    bubbles: true,
    cancelable: opts.cancelable !== false,
    composed: opts.composed === true,
  });
  target.dispatchEvent(event);
  return event;
}

export function cloneTemplate(idOrEl) {
  const tpl = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
  if (!tpl || tpl.tagName !== 'TEMPLATE') return null;
  return tpl.content.firstElementChild?.cloneNode(true) ?? null;
}

export function applyBindings(node, record, formatters = {}) {
  if (!node) return;
  const visit = (n) => {
    if (n.nodeType !== 1) return;
    const bindText = n.getAttribute('data-bind');
    if (bindText) {
      const value = record?.[bindText];
      n.textContent = value == null ? '' : String(value);
    }
    const bindFormatted = n.getAttribute('data-bind-text');
    if (bindFormatted) {
      const value = record?.[bindFormatted];
      const fmt = formatters[bindFormatted];
      n.textContent = fmt ? fmt(value, record) : (value == null ? '' : String(value));
    }
    const bindAttr = n.getAttribute('data-bind-attr');
    if (bindAttr) {
      const pairs = bindAttr.split(/\s*,\s*/);
      for (const pair of pairs) {
        const [attr, field] = pair.split(':').map((s) => s.trim());
        if (!attr || !field) continue;
        const value = record?.[field];
        if (attr.startsWith('--') || attr.startsWith('style:')) {
          const cssVar = attr.startsWith('style:') ? attr.slice(6) : attr;
          n.style.setProperty(cssVar, value == null ? '' : String(value));
        } else if (attr === 'class') {
          if (value) n.classList.add(...String(value).split(/\s+/).filter(Boolean));
        } else if (value === false || value == null) {
          n.removeAttribute(attr);
        } else if (value === true) {
          n.setAttribute(attr, '');
        } else {
          n.setAttribute(attr, String(value));
        }
      }
    }
    for (const child of Array.from(n.children)) visit(child);
  };
  visit(node);
}

export function findClosest(el, selector) {
  if (!el || typeof el.closest !== 'function') return null;
  return el.closest(selector);
}

export function rect(node) {
  return node.getBoundingClientRect();
}

export function listen(target, event, handler, opts) {
  target.addEventListener(event, handler, opts);
  return () => target.removeEventListener(event, handler, opts);
}

export function setCssVar(node, name, value) {
  node.style.setProperty(name.startsWith('--') ? name : `--${name}`, value);
}

export function toggleClass(node, name, on) {
  if (on) node.classList.add(name);
  else node.classList.remove(name);
}
