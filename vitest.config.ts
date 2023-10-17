import { defineConfig } from 'vitest/config';
// import customEnv from './vitest-environment-jsdom.js';

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
    environment: 'happy-dom',
    environmentOptions: {
      jsdom: {},
    },
    include: ['**/*.test.ts', '**/*.test.tsx'],
  },
});
