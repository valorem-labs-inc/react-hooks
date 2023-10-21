import { defineConfig } from 'tsup';
import { dependencies, peerDependencies } from './package.json';

export default defineConfig({
  entry: ['src/index.ts'],
  bundle: true,
  clean: true,
  dts: true,
  format: ['esm'],
  splitting: true,
  target: 'es2021',
  platform: 'browser',
  external: [...Object.keys(dependencies), ...Object.keys(peerDependencies)],
});
