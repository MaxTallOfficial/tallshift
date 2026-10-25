import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({build:{outDir:'../packages/tallshift-ui/dist',emptyOutDir:true,lib:{entry:fileURLToPath(new URL('./src/foundations/index.ts',import.meta.url)),formats:['es'],fileName:()=>'index.js',cssFileName:'styles'},rollupOptions:{external:['react','react-dom','react/jsx-runtime','@hugeicons/react','@hugeicons-pro/core-bulk-rounded'],output:{banner:'"use client";'}}}});
