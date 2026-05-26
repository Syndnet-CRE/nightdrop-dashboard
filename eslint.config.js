import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage',
    'audit-runtime*.js',
    'audit-runtime*.mjs',
  ]),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // Node-environment config files (vite.config.js etc).
  {
    files: ['vite.config.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  // Vendor deal-feed bundle: IIFE modules that read/write a shared
  // window.ND runtime global. They're treated as 3rd-party vendor code,
  // not subject to host coding standards.
  {
    files: ['src/vendor/deal-feed/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ND: 'writable',
        lucide: 'readonly',
      },
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': 'off',
      'no-useless-assignment': 'off',
      'no-case-declarations': 'off',
    },
  },
])
