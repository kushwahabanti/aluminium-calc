import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';

export default defineConfig({
  plugins: [
    viteCommonjs(),
    react(),
  ],
  optimizeDeps: {
    include: ['mathjs'],
  },
});
