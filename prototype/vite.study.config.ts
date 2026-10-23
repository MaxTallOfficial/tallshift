import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: '../art-direction/afterlight',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: { input: 'afterlight.html' },
  },
});
