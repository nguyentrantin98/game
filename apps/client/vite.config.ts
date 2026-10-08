import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const API = process.env.API_URL || 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // client dùng thẳng source TS của luật chơi chung
    alias: { '@army3d/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': API,
      '/ws': { target: API, ws: true },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': API,
      '/ws': { target: API, ws: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          ui: ['motion', 'gsap', 'antd-mobile'],
        },
      },
    },
  },
});
