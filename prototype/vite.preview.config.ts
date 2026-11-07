import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:'preview',envDir:'..',plugins:[react()],build:{outDir:'../dist-preview',emptyOutDir:true,sourcemap:false}});
