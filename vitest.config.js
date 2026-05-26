import { defineConfig } from 'vitest/config';

/* Unit-test config for the JS core. The model/scheduler/calendar modules are
 * pure JS and run under `happy-dom` (cheap enough, lets DOM-using helpers
 * import without splitting two configs). */
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.js', 'test/**/*.spec.js'],
    globals: false,
  },
});
