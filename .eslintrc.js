const path = require('path');

const booleanPrefixes = [
  'is', 'should', 'has', 'have', 'can',
  'did', 'will', 'are', 'was', 'were', 'does',
];

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: path.resolve(__dirname, 'tsconfig.json'),
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    'unused-imports',
    'no-only-tests',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict-type-checked',
  ],
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [
    'dist/',
    'docs/',
    'jest.config.js',
    'node_modules/',
  ],
  rules: {
    // -- Unused variables & imports --
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    'unused-imports/no-unused-imports': 'error',

    // -- Shadowing & redeclaration --
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',
    'no-redeclare': 'off',
    '@typescript-eslint/no-redeclare': 'error',

    // -- Functions --
    'no-empty-function': ['error', { allow: ['constructors'] }],
    'require-await': 'off',

    // -- Type safety --
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', {
      disallowTypeAnnotations: false,
      fixStyle: 'inline-type-imports',
      prefer: 'type-imports',
    }],

    // -- Best practices --
    'no-unsafe-optional-chaining': 'error',
    'default-param-last': 'error',
    'prefer-regex-literals': 'error',
    'no-promise-executor-return': 'error',
    'default-case-last': 'error',
    'no-constant-condition': 'error',
    'no-constructor-return': 'error',
    'camelcase': 'off',

    // -- Tests --
    'no-only-tests/no-only-tests': 'error',

    // -- Naming conventions --
    '@typescript-eslint/naming-convention': ['error',
      {
        selector: 'variable',
        modifiers: ['destructured'],
        format: null,
      },
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      {
        selector: 'enumMember',
        format: ['PascalCase', 'UPPER_CASE'],
      },
      {
        selector: 'variable',
        format: ['camelCase'],
      },
      {
        selector: 'variable',
        modifiers: ['const'],
        format: ['camelCase', 'UPPER_CASE'],
      },
      {
        selector: 'variable',
        modifiers: ['const'],
        types: ['function'],
        format: ['camelCase', 'PascalCase'],
      },
      {
        selector: 'variable',
        types: ['boolean'],
        format: ['PascalCase'],
        prefix: booleanPrefixes,
        filter: {
          regex: '^[A-Z].*',
          match: false,
        },
      },
      {
        selector: 'variable',
        types: ['boolean'],
        format: ['UPPER_CASE'],
        prefix: booleanPrefixes.map((p) => `${p.toUpperCase()}_`),
        filter: {
          regex: '^[a-z].*',
          match: false,
        },
      },
      {
        selector: 'classMethod',
        format: ['camelCase'],
        leadingUnderscore: 'allow',
      },
    ],

    // -- ORM-specific overrides --
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
  },
};
