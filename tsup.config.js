import { defineConfig } from 'tsup';
import { peerDependencies } from './package.json';

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/context/index.ts',
    './src/hooks/index.ts',
    './src/lib/index.ts',
  ],
  format: ['esm'],
  platform: 'browser',
  target: 'es2021',
  clean: true,
  bundle: true,
  splitting: true,
  dts: true,
  treeshake: true,
  sourcemap: 'inline',
  shims: true,
  outExtension({ format }) {
    return {
      js: `.${format === 'esm' ? 'm' : 'c'}js`,
      dts: `.${format}.d.ts`,
    };
  },
  esbuildOptions(options) {
    options.banner = {
      js: '"use client"',
    };
  },
  external: [...Object.keys(peerDependencies)],
});
