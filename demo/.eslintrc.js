const path = require('path');

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: path.resolve(__dirname, 'tsconfig.eslint.json'),
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    'unused-imports',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
  ],
  env: {
    node: true,
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '.eslintrc.js',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    'unused-imports/no-unused-imports': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', {
      disallowTypeAnnotations: false,
      fixStyle: 'inline-type-imports',
      prefer: 'type-imports',
    }],
    '@typescript-eslint/no-misused-promises': ['error', {
      checksVoidReturn: false,
    }],
  },
};
