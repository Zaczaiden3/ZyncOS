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
          '@': path.resolve(__dirname, '.'),
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
                  return 'lucide';
                }
                if (id.includes('pdfjs-dist')) {
                  return 'pdfjs';
                }
                if (id.includes('@google/genai')) {
                  return 'genai';
                }
                return 'vendor';
              }
            }
          }
        },
        chunkSizeWarningLimit: 1000
      }
    };
});
