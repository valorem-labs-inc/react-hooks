const { resolve } = require('node:path');

const project = resolve(process.cwd(), 'tsconfig.json');

/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    '@vercel/style-guide/eslint/browser',
    '@vercel/style-guide/eslint/typescript',
    '@vercel/style-guide/eslint/react',
  ].map(require.resolve),
  parserOptions: {
    project,
  },
  globals: {
    JSX: true,
  },
  settings: {
    'import/resolver': {
      typescript: {
        project,
      },
    },
  },
  plugins: ['canonical'],
  rules: {
    'unicorn/filename-case': 'off',
    'import/no-extraneous-dependencies': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    'canonical/no-barrel-import': 'error',
    'canonical/no-export-all': 'error',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '*.config.*',
    'src/lib/codegen/',
    'src/lib/trade-interfaces/',
    '**/*.cjs',
    'docs',
    'coverage',
    'test',
    '*.test.ts*',
    'package.json',
    'buf.gen.yaml',
    'buf.work.yaml',
  ],
};
