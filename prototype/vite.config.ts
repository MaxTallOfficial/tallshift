import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1', port: 4173, strictPort: false,
    fs: { allow: [fileURLToPath(new URL('.', import.meta.url)), fileURLToPath(new URL('../art-direction/assets/fonts', import.meta.url))] },
  },
  build: { sourcemap: false },
});
