import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync } from 'fs';

const demoDir = resolve(__dirname, 'demo');
const demoPages = Object.fromEntries(
  readdirSync(demoDir)
    .filter((f) => f.endsWith('.html'))
    .map((f) => [`demo/${f.replace(/\.html$/, '')}`, resolve(demoDir, f)])
);

/* Vite roots at the project root so `<script src="../dist/...">` from demo HTMLs
 * resolves to the dist bundle. Demos are served at
 * http://localhost:5173/demo/<page>.html. */
export default defineConfig({
  root: '.',
  publicDir: false,
  build: {
    outDir: resolve(__dirname, 'dist-demos'),
    emptyOutDir: true,
    rollupOptions: {
      input: { index: resolve(demoDir, 'index.html'), ...demoPages },
    },
  },
  server: {
    port: 5173,
    open: false,
    strictPort: false,
    host: true,
    allowedHosts: ['gantt.schappi.cloud', '.schappi.cloud', 'localhost'],
    fs: { allow: [resolve(__dirname, '.')] },
  },
  plugins: [
    {
      name: 'redirect-root-to-demo',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/' || req.url === '') {
            res.writeHead(302, { Location: '/demo/' });
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
});
