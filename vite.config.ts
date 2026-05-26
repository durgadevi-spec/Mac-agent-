import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist/app',
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5013,
    host: true,
  },
});
