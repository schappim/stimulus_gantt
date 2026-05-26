import { defineConfig } from 'vite';
import { resolve } from 'path';

/* Library build — produces two flavors:
 *
 *   dist/stimulus_gantt.js       IIFE, includes @hotwired/stimulus inline.
 *                                Drop into a static <script> tag and call
 *                                window.StimulusGantt.start(). For plain
 *                                HTML / file:// / non-bundler users.
 *
 *   dist/stimulus_gantt.esm.js   ESM module, externalises @hotwired/stimulus.
 *                                Use with importmaps (Rails) or any ES-module
 *                                consumer that pins stimulus separately.
 *
 *   dist/stimulus_gantt.css      Shared default theme.
 *
 * Switch between formats by passing the env var:
 *   FORMAT=iife npx vite build --config vite.lib.config.js
 *   FORMAT=es   npx vite build --config vite.lib.config.js
 *
 * `npm run build:lib` builds both in sequence.
 */
const FORMAT = process.env.FORMAT || 'iife';
const isES = FORMAT === 'es';

export default defineConfig({
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'StimulusGantt',
      fileName: () => isES ? 'stimulus_gantt.esm.js' : 'stimulus_gantt.js',
      formats: [FORMAT],
    },
    rollupOptions: {
      external: isES ? ['@hotwired/stimulus'] : [],
      output: {
        assetFileNames: (info) => info.name.endsWith('.css') ? 'stimulus_gantt.css' : info.name,
        globals: {},
        extend: true,
      },
    },
    sourcemap: true,
    target: 'es2020',
  },
});
