/**
 * ESLint configuration for AsTeRICS-Grid Android.
 * 
 * Enforces:
 * - Strict TypeScript rules
 * - Vue 3 best practices
 * - Code consistency
 * - Performance patterns
 * - Security best practices
 * 
 * @see https://eslint.org/docs/rules/
 */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:vue/vue3-recommended',
    'prettier', // Must be last to override other configs
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2022,
    sourceType: 'module',
    project: ['./tsconfig.json'],
    extraFileExtensions: ['.vue'],
  },
  plugins: ['@typescript-eslint', 'vue'],
  rules: {
    /* TypeScript Specific Rules */
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
      },
    ],
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/strict-boolean-expressions': [
      'error',
      {
        allowString: false,
        allowNumber: false,
        allowNullableObject: false,
      },
    ],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-unnecessary-condition': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'warn',
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'default',
        format: ['camelCase'],
        leadingUnderscore: 'allow',
      },
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow',
      },
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      {
        selector: 'enumMember',
        format: ['UPPER_CASE'],
      },
      {
        selector: 'interface',
        format: ['PascalCase'],
        prefix: ['I'],
      },
    ],

    /* Code Quality Rules */
    'no-console': [
      'warn',
      {
        allow: ['warn', 'error', 'info'],
      },
    ],
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'prefer-destructuring': [
      'warn',
      {
        array: true,
        object: true,
      },
    ],
    'no-nested-ternary': 'warn',
    'no-param-reassign': [
      'error',
      {
        props: true,
      },
    ],
    'no-return-await': 'off', // Handled by @typescript-eslint
    '@typescript-eslint/return-await': ['error', 'always'],

    /* Performance Rules */
    'no-loop-func': 'error',
    'no-await-in-loop': 'warn',

    /* Security Rules */
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',

    /* Vue Specific Rules */
    'vue/multi-word-component-names': 'off', // Allow single-word components
    'vue/component-api-style': ['error', ['script-setup']],
    'vue/block-lang': [
      'error',
      {
        script: {
          lang: 'ts',
        },
      },
    ],
    'vue/component-name-in-template-casing': [
      'error',
      'PascalCase',
      {
        registeredComponentsOnly: false,
      },
    ],
    'vue/custom-event-name-casing': ['error', 'camelCase'],
    'vue/no-unused-components': 'error',
    'vue/no-unused-vars': 'error',
    'vue/require-explicit-emits': 'error',
    'vue/v-on-event-hyphenation': ['error', 'always'],
    'vue/prefer-import-from-vue': 'error',

    /* Best Practices */
    eqeqeq: ['error', 'always'],
    curly: ['error', 'all'],
    'default-case': 'error',
    'default-case-last': 'error',
    'no-else-return': 'warn',
    'no-empty-function': 'off', // Handled by TypeScript
    '@typescript-eslint/no-empty-function': 'error',
    'no-magic-numbers': 'off', // Too strict, handled by code review
    'no-throw-literal': 'error',
    'require-await': 'off', // Handled by TypeScript
    '@typescript-eslint/require-await': 'error',
  },
  overrides: [
    {
      // Relaxed rules for test files
      files: ['**/*.spec.ts', '**/*.test.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
  ],
};