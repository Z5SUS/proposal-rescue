/**
 * Content Script Build Config
 *
 * Chrome content scripts cannot use ES module `import` statements.
 * This config builds ONLY the content script as an IIFE (Immediately
 * Invoked Function Expression) so all dependencies are bundled inline
 * with zero top-level imports in the output file.
 *
 * Run via: vite build --config vite.content.config.ts
 * This runs AFTER the main vite build so it adds to dist/ without clearing it.
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    // Do NOT clear dist — main build already put files there
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/content/index.ts'),
      output: {
        // IIFE format: Rollup inlines ALL static imports into one self-contained file.
        // No top-level import statements → works perfectly as a Chrome content script.
        format: 'iife',
        entryFileNames: 'content/index.js',
      },
    },
    minify: 'esbuild',
  },
});
