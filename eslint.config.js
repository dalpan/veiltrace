import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const nodeGlobals = { process: 'readonly', console: 'readonly', URL: 'readonly' };

// src/core must stay a pure function of its input (ARCHITECTURE.md §1, CLAUDE.md).
const CORE_FORBIDDEN_GLOBALS = [
  'window', 'document', 'self', 'globalThis', 'navigator', 'location',
  'chrome', 'browser',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts',
  'setTimeout', 'setInterval', 'queueMicrotask', 'requestAnimationFrame',
  'performance', 'localStorage', 'sessionStorage', 'indexedDB', 'process',
].map((name) => ({ name, message: 'src/core must not depend on browser, Node or runtime globals.' }));

export default defineConfig(
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  js.configs.recommended,
  tseslint.configs.strict,
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...CORE_FORBIDDEN_GLOBALS],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'src/core must be deterministic.' },
        { object: 'Math', property: 'random', message: 'src/core must be deterministic.' },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "NewExpression[callee.name='Date']", message: 'src/core must be deterministic.' },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.ts', '*.config.*'],
    languageOptions: { globals: nodeGlobals },
  },
  {
    files: ['tests/**/*.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
