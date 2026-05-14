import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(env.npm_package_version ?? '0.0.0-dev'),
    },
    server: {
      port: 5173,
      strictPort: false,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      target: 'es2022',
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('react-router')) return 'router';
            if (id.includes('@tanstack')) return 'tanstack';
            if (id.includes('@sentry')) return 'sentry';
            if (id.includes('@opentelemetry')) return 'otel';
            if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n';
            if (id.includes('zod')) return 'zod';
            if (id.includes('react-dom') || id.includes('scheduler')) return 'react';
            return undefined;
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
