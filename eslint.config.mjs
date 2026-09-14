import tseslint from 'typescript-eslint'

// Typechecking owns type correctness; Prettier owns formatting. These rules
// prevent executable-data regressions and flag unused authored declarations.
export default [
  {
    ignores: [
      'dist/**',
      'site/dist/**',
      '**/node_modules/**',
      'src/validation/structural.js',
      'site/src/generated/**',
      'examples/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  {
    files: [
      'src/**/*.{ts,tsx}',
      'site/src/**/*.{ts,tsx}',
      'scripts/**/*.{ts,tsx,mjs}',
      'site/docs/*.js',
      'tests/**/*.{ts,mjs,tsx}',
    ],
    languageOptions: { parser: tseslint.parser, ecmaVersion: 2022, sourceType: 'module' },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-debugger': 'error',
      'constructor-super': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
]
