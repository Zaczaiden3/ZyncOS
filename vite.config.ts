/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('react-dom')) {
                  return 'react-vendor';
                }
                if (id.includes('recharts')) {
                  return 'recharts';
                }
                if (id.includes('lucide-react')) {
                  return 'ui-vendor';
                }
                if (id.includes('firebase')) {
                  return 'firebase';
                }
                if (id.includes('pdfjs-dist')) {
                  return 'pdfjs';
                }
                if (id.includes('@google/genai')) {
                  return 'genai';
                }
                if (id.includes('@mlc-ai/web-llm')) {
                  return 'web-llm';
                }
                if (id.includes('idb') || id.includes('voy-search') || id.includes('@openrouter/sdk')) {
                  return 'utils-vendor';
                }
                return 'vendor';
              }
            }
          }
        },
        chunkSizeWarningLimit: 6000
      }
    };
});
