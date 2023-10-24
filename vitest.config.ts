import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      exclude: ['src/lib/codegen/**'],
    },
    environment: 'happy-dom',
    reporters: ['default', 'hanging-process'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
  },
});
