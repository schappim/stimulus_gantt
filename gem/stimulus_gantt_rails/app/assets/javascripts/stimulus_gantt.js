// Vendored re-export so importmap can pin the JS bundle without npm.
// In production, replace this with the actual built ESM bundle from
// `dist/stimulus_gantt.esm.js` (the `bin/sync-rails-assets` script
// drops the latest build in place).

export * from '/path/to/stimulus_gantt.esm.js';
export { default } from '/path/to/stimulus_gantt.esm.js';
