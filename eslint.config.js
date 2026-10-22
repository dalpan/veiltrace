import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const nodeGlobals = { process: 'readonly', console: 'readonly', URL: 'readonly', Buffer: 'readonly' };

// src/core must stay a pure function of its input (ARCHITECTURE.md §1, CLAUDE.md).
const CORE_FORBIDDEN_GLOBALS = [
  'window', 'document', 'self', 'globalThis', 'navigator', 'location',
  'chrome', 'browser',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts',
  'setTimeout', 'setInterval', 'queueMicrotask', 'requestAnimationFrame',
  'performance', 'localStorage', 'sessionStorage', 'indexedDB', 'process',
].map((name) => ({ name, message: 'src/core must not depend on browser, Node or runtime globals.' }));

export default defineConfig(
  { ignores: ['dist/', 'coverage/', 'node_modules/', 'submission/', 'release/'] },
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
    // The extractor reads the page; it must never write to it, dispatch events or talk to the network.
    files: ['src/extract/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'eval', 'chrome', 'browser']
        .map((name) => ({ name, message: 'src/extract must not use network, dynamic code or extension APIs.' }))],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name=/^(appendChild|append|prepend|removeChild|remove|insertBefore|replaceChild|replaceWith|replaceChildren|before|after|setAttribute|setAttributeNS|removeAttribute|toggleAttribute|insertAdjacentHTML|insertAdjacentElement|insertAdjacentText|click|focus|blur|submit|requestSubmit|write|writeln|attachShadow|showModal|scrollIntoView|scrollTo|dispatchEvent|execCommand|setProperty)$/]",
          message: 'src/extract must not mutate the DOM or trigger page behavior.',
        },
        {
          selector: "AssignmentExpression[left.type='MemberExpression'][left.property.name=/^(innerHTML|outerHTML|textContent|innerText|outerText|value|nodeValue|data|className|id|src|href|hidden|checked|cssText|scrollTop|scrollLeft)$/]",
          message: 'src/extract must not mutate the DOM.',
        },
        { selector: "NewExpression[callee.name='Function']", message: 'No dynamic code.' },
      ],
    },
  },
  {
    // Extension code renders untrusted page text: no HTML sinks, no dynamic code, no network.
    files: ['src/extension/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'eval']
        .map((name) => ({ name, message: 'src/extension must not use network or dynamic code.' }))],
      'no-restricted-syntax': [
        'error',
        { selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML|srcdoc)$/]", message: 'Render text with textContent / text nodes only.' },
        { selector: "CallExpression[callee.property.name=/^(insertAdjacentHTML|write|writeln|createContextualFragment|parseFromString)$/]", message: 'No HTML parsing sinks.' },
        { selector: "NewExpression[callee.name='Function']", message: 'No dynamic code.' },
        { selector: "CallExpression[callee.object.name='chrome'][callee.property.name=/^(sendMessage|connect)$/], MemberExpression[property.name=/^(onMessage|onMessageExternal|onConnect|onConnectExternal)$/]", message: 'No extension messaging surface (D-035); the auto-scan channel lives only in src/extension/auto/channel.ts (D-081).' },
      ],
    },
  },
  {
    // D-081: the single, one-way auto-scan channel. Same rules as above, minus the messaging ban; still no onConnect/external.
    files: ['src/extension/auto/channel.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML|srcdoc)$/]", message: 'Render text with textContent / text nodes only.' },
        { selector: "NewExpression[callee.name='Function']", message: 'No dynamic code.' },
        { selector: "CallExpression[callee.property.name='connect'], MemberExpression[property.name=/^(onMessageExternal|onConnect|onConnectExternal)$/]", message: 'Only runtime.sendMessage / runtime.onMessage are allowed here (D-081).' },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.ts', 'src/eval/**/*.ts', '*.config.*'],
    languageOptions: { globals: nodeGlobals },
  },
  {
    files: ['tests/**/*.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    // Landing page (veiltrace.click): plain browser scripts with no network APIs.
    files: ['src/site/**/*.js'],
    languageOptions: { globals: { window: 'readonly', self: 'readonly', caches: 'readonly', URL: 'readonly' } },
    rules: { 'no-restricted-globals': ['error', 'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'eval'] },
  },
);
