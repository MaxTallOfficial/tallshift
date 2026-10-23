import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ base: './', plugins: [react()], build: { outDir: '../art-direction/foundations', emptyOutDir: true, sourcemap: false, rollupOptions: { input: 'foundations.html' } } });
