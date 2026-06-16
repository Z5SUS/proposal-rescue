import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        // Extension pages
        popup: resolve(__dirname, 'popup.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        options: resolve(__dirname, 'options.html'),
        // Background service worker (MV3 workers support ES modules natively)
        'background/index': resolve(__dirname, 'src/background/index.ts'),
        // Content script CSS (referenced in manifest "css" array)
        // NOTE: content/index.ts is built separately via vite.content.config.ts
        //       as an IIFE because Chrome content scripts cannot be ES modules.
        'content/content': resolve(__dirname, 'src/content/content.css'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? '';
          if (name.endsWith('.css')) {
            // Route content.css to match the manifest's css declaration:
            //   "css": ["content/content.css"]
            // We check both the bare name and the full originalFileName path.
            const origPath = assetInfo.originalFileNames?.[0] ?? '';
            if (
              name === 'content.css' ||
              origPath.includes('src/content/content.css')
            ) {
              return 'content/content.css';
            }
            return 'assets/[name][extname]';
          }
          return 'assets/[name][extname]';
        },
      },
    },
    // Ensure content scripts are not treated as modules that need dynamic imports
    minify: 'esbuild',
  },
  css: {
    postcss: './postcss.config.js',
  },
});
