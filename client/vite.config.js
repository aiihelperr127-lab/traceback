import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Parent folder has full VITE_* + server vars; see BUILD.md for NODE_ENV note
  envDir: path.resolve(__dirname, '..'),
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    cssMinify: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) return 'firebase';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/'))
            return 'react-vendor';
          if (id.includes('node_modules/react-router')) return 'router';
        },
      },
    },
  },
});
