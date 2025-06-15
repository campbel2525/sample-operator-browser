// eslint.config.js

const globals = require('globals')
const js = require('@eslint/js')
const tseslint = require('typescript-eslint')
const prettierConfig = require('eslint-config-prettier')

module.exports = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['eslint.config.js'],
    // ■■■ ここから追加 ■■■
    rules: {
      // 設定ファイルでは require() を許可する
      '@typescript-eslint/no-require-imports': 'off',
    },
    // ■■■ ここまで追加 ■■■
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  prettierConfig
)
